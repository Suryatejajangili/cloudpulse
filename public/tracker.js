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
   * Resolves target API base URL from the currently executing script element.
   * If hosted on https://analytics.example.com/tracker.js, target is https://analytics.example.com
   */
  function getApiEndpoint() {
    var script = document.currentScript || document.querySelector("script[src*='tracker.js']");
    if (script && script.src) {
      try {
        var scriptUrl = new URL(script.src, window.location.href);
        return scriptUrl.origin + "/api/events";
      } catch (err) {
        // fallback to relative path
      }
    }
    return "/api/events";
  }

  /**
   * Dispatches a page-view event to CloudPulse backend.
   */
  function trackPageView() {
    try {
      var payload = {
        visitor_id: getVisitorId(),
        page_path: window.location.pathname || "/",
        referrer: document.referrer || ""
      };

      var endpoint = getApiEndpoint();
      var serialized = JSON.stringify(payload);

      if (typeof fetch === "function") {
        fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: serialized,
          keepalive: true,
          mode: "cors",
          credentials: "omit"
        }).catch(function () {
          // Fail silently to never interfere with host site execution
        });
      } else if (navigator.sendBeacon) {
        var blob = new Blob([serialized], { type: "application/json" });
        navigator.sendBeacon(endpoint, blob);
      }
    } catch (err) {
      // Fail silently
    }
  }

  // Execute tracking when DOM is ready
  if (document.readyState === "complete" || document.readyState === "interactive") {
    trackPageView();
  } else {
    document.addEventListener("DOMContentLoaded", trackPageView);
  }
})();
