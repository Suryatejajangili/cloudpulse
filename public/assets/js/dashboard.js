/**
 * CloudPulse Dashboard Logic
 * Handles real-time metrics, Chart.js instances, date filtering,
 * and data hydration for the SaaS monitoring interface.
 */

(function () {
  "use strict";

  // State management
  var state = {
    dateRange: { from: "", to: "" },
    charts: {
      daily: null,
      pages: null
    },
    isLoading: false
  };

  // DOM Elements
  var elements = {
    totalViews: document.getElementById("metric-total-views"),
    uniqueVisitors: document.getElementById("metric-unique-visitors"),
    todayViews: document.getElementById("metric-today-views"),
    todayVisitors: document.getElementById("metric-today-visitors"),
    pagesTableBody: document.getElementById("pages-table-body"),
    eventsTableBody: document.getElementById("events-table-body"),
    dailyChartCanvas: document.getElementById("daily-chart"),
    pagesChartCanvas: document.getElementById("pages-chart"),
    dateFrom: document.getElementById("filter-from"),
    dateTo: document.getElementById("filter-to"),
    btnApplyFilter: document.getElementById("btn-apply-filter"),
    btnResetFilter: document.getElementById("btn-reset-filter"),
    btnRefresh: document.getElementById("btn-refresh"),
    errorBanner: document.getElementById("error-banner"),
    loadingSpinner: document.getElementById("loading-spinner"),
    healthStatus: document.getElementById("system-health-status"),
    snippetCode: document.getElementById("tracker-snippet-code"),
    btnCopySnippet: document.getElementById("btn-copy-snippet")
  };

  /**
   * Helper: safe JSON fetch
   */
  async function fetchJson(endpoint) {
    var res = await fetch(endpoint, {
      headers: { Accept: "application/json" }
    });
    if (!res.ok) {
      var errData;
      try {
        errData = await res.json();
      } catch (e) {
        errData = { error: "HTTP " + res.status + " " + res.statusText };
      }
      throw new Error(errData.error || "Failed to load " + endpoint);
    }
    return res.json();
  }

  function showError(msg) {
    if (elements.errorBanner) {
      elements.errorBanner.textContent = msg;
      elements.errorBanner.classList.add("visible");
    }
  }

  function clearError() {
    if (elements.errorBanner) {
      elements.errorBanner.classList.remove("visible");
      elements.errorBanner.textContent = "";
    }
  }

  function setLoading(loading) {
    state.isLoading = loading;
    if (elements.loadingSpinner) {
      if (loading) elements.loadingSpinner.classList.add("active");
      else elements.loadingSpinner.classList.remove("active");
    }
  }

  /**
   * Format numbers with commas (e.g. 1,420)
   */
  function formatNum(n) {
    return (n || 0).toLocaleString();
  }

  /**
   * Format ISO date string into readable relative or UTC time
   */
  function formatTimestamp(isoStr) {
    try {
      var d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) +
        " · " + d.toISOString().slice(0, 10);
    } catch (e) {
      return isoStr;
    }
  }

  /**
   * Construct query string for date filtering
   */
  function buildQuery() {
    var q = new URLSearchParams();
    if (state.dateRange.from) q.set("from", state.dateRange.from);
    if (state.dateRange.to) q.set("to", state.dateRange.to);
    var str = q.toString();
    return str ? "?" + str : "";
  }

  /**
   * Hydrate Integration Snippet box
   */
  function setupSnippet() {
    var origin = window.location.origin;
    var snippet = '<script src="' + origin + '/tracker.js" defer></script>';
    if (elements.snippetCode) elements.snippetCode.textContent = snippet;

    if (elements.btnCopySnippet) {
      elements.btnCopySnippet.addEventListener("click", function () {
        navigator.clipboard.writeText(snippet).then(function () {
          var originalText = elements.btnCopySnippet.textContent;
          elements.btnCopySnippet.textContent = "Copied!";
          setTimeout(function () {
            elements.btnCopySnippet.textContent = originalText;
          }, 2000);
        });
      });
    }
  }

  /**
   * Fetch system health status
   */
  async function loadHealth() {
    try {
      var res = await fetchJson("/api/health");
      if (res.success && res.data && elements.healthStatus) {
        elements.healthStatus.textContent = "API " + res.data.status.toUpperCase() + " (" + res.data.environment + ")";
      }
    } catch (e) {
      if (elements.healthStatus) {
        elements.healthStatus.textContent = "API Degraded";
      }
    }
  }

  /**
   * Fetch and render summary cards
   */
  async function loadSummary() {
    var res = await fetchJson("/api/analytics/summary" + buildQuery());
    if (res.success && res.data) {
      var d = res.data;
      elements.totalViews.textContent = formatNum(d.total_views);
      elements.uniqueVisitors.textContent = formatNum(d.unique_visitors);
      elements.todayViews.textContent = formatNum(d.today_views);
      elements.todayVisitors.textContent = formatNum(d.today_unique_visitors);
    }
  }

  /**
   * Fetch and render page traffic table & chart
   */
  async function loadPages() {
    var res = await fetchJson("/api/analytics/pages" + buildQuery());
    if (res.success && Array.isArray(res.data)) {
      var pages = res.data;
      renderPagesTable(pages);
      renderPagesChart(pages);
    }
  }

  function renderPagesTable(pages) {
    if (!elements.pagesTableBody) return;
    if (pages.length === 0) {
      elements.pagesTableBody.innerHTML =
        '<tr><td colspan="4" class="empty-state">No page traffic recorded yet. Add tracker.js to start capturing visits.</td></tr>';
      return;
    }

    var total = pages.reduce(function (acc, p) { return acc + (p.view_count || 0); }, 0);

    var rows = pages.map(function (p) {
      var pct = total > 0 ? ((p.view_count / total) * 100).toFixed(1) : 0;
      return (
        "<tr>" +
        '<td class="path-cell" title="' + p.page_path + '">' + p.page_path + "</td>" +
        "<td>" + formatNum(p.view_count) + "</td>" +
        "<td>" + formatNum(p.unique_visitors) + "</td>" +
        "<td>" + pct + "%</td>" +
        "</tr>"
      );
    });

    elements.pagesTableBody.innerHTML = rows.join("");
  }

  function renderPagesChart(pages) {
    if (!elements.pagesChartCanvas || typeof Chart === "undefined") return;

    var topPages = pages.slice(0, 5);
    var labels = topPages.map(function (p) { return p.page_path; });
    var data = topPages.map(function (p) { return p.view_count; });

    if (state.charts.pages) {
      state.charts.pages.destroy();
    }

    var ctx = elements.pagesChartCanvas.getContext("2d");
    state.charts.pages = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels.length ? labels : ["No data"],
        datasets: [
          {
            data: data.length ? data : [1],
            backgroundColor: [
              "#3b82f6",
              "#06b6d4",
              "#10b981",
              "#8b5cf6",
              "#f59e0b"
            ],
            borderWidth: 2,
            borderColor: "#111827"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: "#94a3b8", font: { size: 11 } }
          }
        }
      }
    });
  }

  /**
   * Fetch and render daily traffic trends
   */
  async function loadDaily() {
    var res = await fetchJson("/api/analytics/daily");
    if (res.success && Array.isArray(res.data)) {
      renderDailyChart(res.data);
    }
  }

  function renderDailyChart(dailyData) {
    if (!elements.dailyChartCanvas || typeof Chart === "undefined") return;

    var labels = dailyData.map(function (d) { return d.date; });
    var views = dailyData.map(function (d) { return d.view_count; });
    var visitors = dailyData.map(function (d) { return d.unique_visitors; });

    if (state.charts.daily) {
      state.charts.daily.destroy();
    }

    var ctx = elements.dailyChartCanvas.getContext("2d");
    state.charts.daily = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Page Views",
            data: views,
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            fill: true,
            tension: 0.35,
            borderWidth: 2
          },
          {
            label: "Unique Visitors",
            data: visitors,
            borderColor: "#06b6d4",
            backgroundColor: "transparent",
            borderDash: [4, 4],
            tension: 0.35,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { color: "#1e293b" },
            ticks: { color: "#64748b", font: { size: 11 } }
          },
          y: {
            beginAtZero: true,
            grid: { color: "#1e293b" },
            ticks: { color: "#64748b", precision: 0 }
          }
        },
        plugins: {
          legend: {
            position: "top",
            labels: { color: "#94a3b8", font: { size: 12 } }
          }
        }
      }
    });
  }

  /**
   * Fetch and render recent visitor events
   */
  async function loadRecent() {
    var res = await fetchJson("/api/analytics/recent");
    if (res.success && Array.isArray(res.data)) {
      renderRecentTable(res.data);
    }
  }

  function renderRecentTable(events) {
    if (!elements.eventsTableBody) return;
    if (events.length === 0) {
      elements.eventsTableBody.innerHTML =
        '<tr><td colspan="3" class="empty-state">No recent activity logged yet.</td></tr>';
      return;
    }

    var rows = events.map(function (e) {
      return (
        "<tr>" +
        '<td class="time-cell">' + formatTimestamp(e.timestamp) + "</td>" +
        '<td class="path-cell" title="' + e.page_path + '">' + e.page_path + "</td>" +
        '<td class="ref-cell" title="' + (e.referrer || "Direct / Internal") + '">' +
        (e.referrer ? e.referrer : '<span style="color:#64748b">Direct</span>') +
        "</td>" +
        "</tr>"
      );
    });

    elements.eventsTableBody.innerHTML = rows.join("");
  }

  /**
   * Refresh all dashboard components
   */
  async function refreshDashboard() {
    clearError();
    setLoading(true);
    try {
      await Promise.all([
        loadHealth(),
        loadSummary(),
        loadPages(),
        loadDaily(),
        loadRecent()
      ]);
    } catch (err) {
      showError(err.message || "Failed to fetch analytics data");
    } finally {
      setLoading(false);
    }
  }

  /**
   * Wire event listeners
   */
  function initListeners() {
    if (elements.btnRefresh) {
      elements.btnRefresh.addEventListener("click", refreshDashboard);
    }

    if (elements.btnApplyFilter) {
      elements.btnApplyFilter.addEventListener("click", function () {
        state.dateRange.from = elements.dateFrom ? elements.dateFrom.value : "";
        state.dateRange.to = elements.dateTo ? elements.dateTo.value : "";
        refreshDashboard();
      });
    }

    if (elements.btnResetFilter) {
      elements.btnResetFilter.addEventListener("click", function () {
        if (elements.dateFrom) elements.dateFrom.value = "";
        if (elements.dateTo) elements.dateTo.value = "";
        state.dateRange.from = "";
        state.dateRange.to = "";
        refreshDashboard();
      });
    }
  }

  // Initialize
  document.addEventListener("DOMContentLoaded", function () {
    setupSnippet();
    initListeners();
    refreshDashboard();

    // When tracker records a page visit, refresh the dashboard metrics
    window.addEventListener("cloudpulse:tracked", function () {
      refreshDashboard();
    });
  });
})();

