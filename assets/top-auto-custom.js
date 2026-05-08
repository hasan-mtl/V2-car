(function () {
  function onReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
      return;
    }
    callback();
  }

  function renderReviews() {
    var reviewHost = document.querySelector(".elementor-element-b2661b3 .elementor-shortcode");
    if (!reviewHost || document.getElementById("topauto-static-reviews")) return;

    var reviews = [
      {
        quote: "Best paint protection film specialists in CT. The finish came out clean and the team was easy to work with.",
        name: "Erick",
        service: "Paint Protection Film"
      },
      {
        quote: "Got tints all around and the windshield done on my Acura RSX. Great work, no bubbles, and high quality tint.",
        name: "Adalberto Maura",
        service: "Window Tint"
      },
      {
        quote: "Finally, a local shop that does it all correctly and with integrity. Full PPF, windshield, and tint done here.",
        name: "Michael Morningstar",
        service: "Full Protection Package"
      }
    ];

    reviewHost.innerHTML = [
      '<div id="topauto-static-reviews" class="topauto-reviews" aria-label="Customer reviews">',
      reviews.map(function (review) {
        return [
          '<article class="topauto-review">',
          '<div class="topauto-review__stars" aria-label="5 star review">&#9733;&#9733;&#9733;&#9733;&#9733;</div>',
          '<p class="topauto-review__quote">"' + review.quote + '"</p>',
          '<div class="topauto-review__name">' + review.name + '</div>',
          '<div class="topauto-review__service">' + review.service + '</div>',
          '</article>'
        ].join("");
      }).join(""),
      '</div>'
    ].join("");
  }

  onReady(function () {
    renderReviews();
    window.setTimeout(renderReviews, 800);
    window.setTimeout(renderReviews, 2200);
  });
}());
