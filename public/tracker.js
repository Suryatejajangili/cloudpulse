/**
 * CloudPulse Tracker Script
 * Lightweight, privacy-preserving client tracking snippet.
 * 
 * Features:
 *  - Generates/persists an anonymous client-side visitor ID (UUID v4)
 *  - No cookies, no IP tracking, no personal identifying information (PII)
 *  - Automatically resolves host API endpoint from script tag origin
 *  - Uses keepalive fetch / sendBeacon for non-blocking telemetry
 */
(function () {
  "use strict";

  // Prevent duplicate execution in case script is injected multiple times
  if (window.__CLOUDPULSE_LOADED__) return;
  window.__CLOUDPULSE_LOADED__ = true;

  var STORAGE_KEY = "cp_vid";

  // Capture script element at parse/execution time when document.currentScript is guaranteed
  var scriptTag = document.currentScript || document.querySelector("script[src*='tracker.js']");

  /**
   * Generates a standard UUID v4 or high-entropy alphanumeric string
   * satisfying /^[a-zA-Z0-9_-]{8,64}$/
   */
  function generateVisitorId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    // Fallback pseudo-random identifier
    var template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
    return template.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Retrieves existing anonymous visitor ID from localStorage or creates a new one.
   */
  function getVisitorId() {
    try {
      var vid = localStorage.getItem(STORAGE_KEY);
      if (vid && /^[a-zA-Z0-9_-]{8,64}$/.test(vid)) {
        return vid;
      }
      vid = generateVisitorId();
      localStorage.setItem(STORAGE_KEY, vid);
      return vid;
    } catch (e) {
      // If localStorage is blocked (e.g. incognito/restricted policies),
      // generate an in-memory session identifier
      return generateVisitorId();
    }
  }

  /**
   * Resolves target API base URL.
   * 1. Checks custom data-endpoint attribute if provided.
   * 2. Resolves origin from script tag src (e.g. https://cloudpulse.domain.workers.dev/api/events).
   * 3. Falls back to relative /api/events.
   */
  function getApiEndpoint() {
    var tag = scriptTag || document.querySelector("script[src*='tracker.js']");
    if (tag) {
      var customEndpoint = tag.getAttribute("data-endpoint");
      if (customEndpoint) {
        return customEndpoint;
      }
      if (tag.src) {
        try {
          var scriptUrl = new URL(tag.src, window.location.href);
          return scriptUrl.origin + "/api/events";
        } catch (err) {
          // fallback
        }
      }
    }
    return "/api/events";
  }

  /**
   * Dispatches a page-view event to CloudPulse backend.
   * Returns a Promise that resolves when the event request completes.
   */
  function trackPageView(customPath) {
    try {
      var payload = {
        visitor_id: getVisitorId(),
        page_path: customPath || window.location.pathname || "/",
        referrer: document.referrer || ""
      };

      var endpoint = getApiEndpoint();
      var serialized = JSON.stringify(payload);

      if (typeof fetch === "function") {
        return fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: serialized,
          keepalive: true,
          mode: "cors",
          credentials: "omit"
        })
          .then(function (res) {
            if (res.ok) {
              // Dispatch event so host applications (like the dashboard) can react
              try {
                window.dispatchEvent(
                  new CustomEvent("cloudpulse:tracked", { detail: payload })
                );
              } catch (evErr) {}
            } else {
              if (typeof console !== "undefined" && console.warn) {
                console.warn("[CloudPulse] Tracking rejected:", res.status);
              }
            }
            return res;
          })
          .catch(function (err) {
            if (typeof console !== "undefined" && console.warn) {
              console.warn("[CloudPulse] Tracking failed:", err);
            }
          });
      } else if (navigator.sendBeacon) {
        var blob = new Blob([serialized], { type: "application/json" });
        navigator.sendBeacon(endpoint, blob);
      }
    } catch (err) {
      if (typeof console !== "undefined" && console.warn) {
        console.warn("[CloudPulse] Tracker exception:", err);
      }
    }
  }

  // Expose public API for single-page apps or manual trigger
  window.CloudPulse = {
    track: trackPageView,
    getVisitorId: getVisitorId,
    getEndpoint: getApiEndpoint
  };

  // Execute tracking when DOM is ready
  if (document.readyState === "complete" || document.readyState === "interactive") {
    trackPageView();
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      trackPageView();
    });
  }
})();
