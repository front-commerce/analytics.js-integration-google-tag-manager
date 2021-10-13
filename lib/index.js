"use strict";

/**
 * Module dependencies.
 */

var integration = require("@segment/analytics.js-integration");
var push = require("global-queue")("dataLayer", { wrap: false });

/**
 * Expose `GTM`.
 */

var GTM = (module.exports = integration("Google Tag Manager")
  .global("dataLayer")
  .global("google_tag_manager")
  .option("containerId", "")
  .option("environment", "")
  .option("trackNamedPages", true)
  .option("trackCategorizedPages", true)
  .tag(
    "no-env",
    '<script src="//www.googletagmanager.com/gtm.js?id={{ containerId }}&l=dataLayer">'
  )
  .tag(
    "with-env",
    '<script src="//www.googletagmanager.com/gtm.js?id={{ containerId }}&l=dataLayer&gtm_preview={{ environment }}">'
  ));

const buildResetObjects = (props) => {
  const resetPreviousProps = {};
  Object.keys(props).forEach((key) => {
    if (key !== "gtm" && key !== "userConsents") {
      resetPreviousProps[key] = undefined;
    }
  });
  return resetPreviousProps;
};

/**
 * Initialize.
 *
 * https://developers.google.com/tag-manager
 *
 * @api public
 */

GTM.prototype.initialize = function () {
  this.previousProps = {};
  push({ "gtm.start": Number(new Date()), event: "gtm.js" });
  push({ userConsents: this.options.userConsents });

  if (this.options.environment.length) {
    this.load("with-env", this.options, this.ready);
  } else {
    this.load("no-env", this.options, this.ready);
  }
};

/**
 * Loaded?
 *
 * @api private
 * @return {boolean}
 */

GTM.prototype.loaded = function () {
  return !!(window.dataLayer && Array.prototype.push !== window.dataLayer.push);
};

/**
 * Page.
 *
 * @api public
 * @param {Page} page
 */

GTM.prototype.page = function (page) {
  var category = page.category();
  var name = page.fullName();
  var opts = this.options;

  // all
  if (opts.trackAllPages) {
    this.track(page.track(), true);
  }

  // categorized
  if (category && opts.trackCategorizedPages) {
    this.track(page.track(category), true);
  }

  // named
  if (name && opts.trackNamedPages) {
    this.track(page.track(name), true);
  }
};

/**
 * Track.
 *
 * https://developers.google.com/tag-manager/devguide#events
 *
 * @api public
 * @param {Track} track
 * @param {Boolean} [pageChange]
 */

GTM.prototype.track = function (track, pageChange) {
  var props = track.properties();
  var userId = this.analytics.user().id();
  var anonymousId = this.analytics.user().anonymousId();
  if (userId) props.userId = userId;
  if (anonymousId) props.segmentAnonymousId = anonymousId;
  props.event = track.event();
  if (pageChange) {
    // in case of page change, we make sure we start from a fresh state
    // to avoid mixing stuff between pages. Since, GTM merges everything
    // recursively, we build a props object that will overwrite everything
    // and then set the actual properties for the new page.
    const resetPreviousProps = buildResetObjects(this.previousProps);
    props = { ...resetPreviousProps, ...props };
  }

  push(props);
  this.previousProps = { ...this.previousProps, ...props };
};
