!(function () {
  window.addEventListener("oauthTokenReceived", function (e) {
    e.preventDefault(), e.stopPropagation();
    var location = e.detail.goToLocation;
    document.location.replace(location);
  });
})();
