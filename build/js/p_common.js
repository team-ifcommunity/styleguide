// 페이지 로드 시 실행
document.addEventListener("DOMContentLoaded", function () {
  animateProgressBars();
  initModal(); // 모달 열기/닫기
});

// 모달 열기/닫기
function initModal() {
  document.querySelectorAll(".js-modal-open").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var modalId = this.getAttribute("data-modal");
      var overlay = document.getElementById(modalId);
      if (overlay) {
        overlay.classList.add("is-open");
        overlay.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
      }
    });
  });

  function closeModal(overlay) {
    if (overlay) {
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }
  }

  document.querySelectorAll(".modal-overlay").forEach(function (overlay) {
    overlay
      .querySelectorAll(".modal-close, .modal-btn-close")
      .forEach(function (btn) {
        btn.addEventListener("click", function () {
          closeModal(overlay);
        });
      });
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal(overlay);
    });
  });

  document
    .querySelectorAll(".confirm-modal-overlay")
    .forEach(function (overlay) {
      overlay
        .querySelectorAll(
          ".confirm-modal .close, .confirm-modal .modal-btn-close",
        )
        .forEach(function (btn) {
          btn.addEventListener("click", function () {
            closeModal(overlay);
          });
        });
      overlay
        .querySelectorAll(".confirm-modal .btn-yes")
        .forEach(function (btn) {
          btn.addEventListener("click", function () {
            closeModal(overlay);
            document
              .querySelectorAll(".modal-overlay.is-open")
              .forEach(function (openOverlay) {
                closeModal(openOverlay);
              });
          });
        });
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) closeModal(overlay);
      });
    });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      document
        .querySelectorAll(
          ".modal-overlay.is-open, .confirm-modal-overlay.is-open",
        )
        .forEach(function (overlay) {
          closeModal(overlay);
        });
    }
  });
}

// 윈도우 리사이즈 시 실행
window.addEventListener("resize", function () {
  animateProgressBars();
});

function animateProgressBars() {
  const progressBars = document.querySelectorAll("progress");

  progressBars.forEach(function (progress) {
    const targetValue = progress.getAttribute("value");

    // 초기값을 0으로 설정
    progress.value = 0;

    // 애니메이션 시작
    setTimeout(function () {
      animateValue(progress, 0, targetValue, 1000);
    }, 100);
  });
}

function animateValue(element, start, end, duration) {
  const range = end - start;
  const increment = range / (duration / 16); // 60fps 기준
  let current = start;

  const timer = setInterval(function () {
    current += increment;
    if (current >= end) {
      element.value = end;
      clearInterval(timer);
    } else {
      element.value = current;
    }
  }, 16);
}

function initRdiBadge() {
  document.querySelectorAll(".rdi-badge .badge").forEach((badge) => {
    badge.addEventListener("click", function () {
      this.closest(".rdi-badge")
        .querySelectorAll(".badge")
        .forEach((b) => b.classList.remove("is-active"));
      this.classList.add("is-active");
    });
  });
}

document.addEventListener("DOMContentLoaded", initRdiBadge);
