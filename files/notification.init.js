var isLocked = false;
var audio = new Audio("/notification_web.mp3?1");
function showNotification(type, title, message, link = null) {
  audio.play();
  toastr.options = {
    closeButton: true,
    progressBar: true,
    timeOut: 7500,
    extendedTimeOut: 2000,
    positionClass: "toast-top-right",
    preventDuplicates: true,
    onShown: function () {
      let allToasts = document.querySelectorAll("#toast-container > .toast");
      allToasts.forEach((toast, index) => {
        setTimeout(() => {
          toast.classList.add("fadeOut");
          setTimeout(() => {
            toast.remove();
          }, 500);
        }, 7500 + index * 500);
      });
    },
    onclick: function () {
      if (link) {
        window.location.href = link;
      }
    },
  };
  let iconHTML = "";
  toastr[type](`<span class="toast-icon">${iconHTML}</span> ${message}`, title);
}
function handleNewNotification(data) {
  var notificationId = data.id;
  var existingNotification = $("#notification-container").find(
    `[data-id="${notificationId}"]`
  );
  if (existingNotification.length === 0) {
    var newNotification = `
    <a href="${data.href}" class="text-reset notification-item" data-id="${notificationId}">
        <div class="d-flex border-bottom align-items-start">
            <div class="flex-shrink-0">
                <img src="${data.person?.profile_image}" class="me-3 rounded-circle avatar-sm" alt="user-pic">
            </div>
            <div class="flex-grow-1">
                <h6 class="mb-1">${data.person?.full_name}</h6>
                <div class="text-muted">
                    <p class="mb-1 font-size-13">${data.title}<span class="badge badge-warning-subtle">Oxunmayıb</span></p>
                    <p class="mb-0 font-size-10 text-uppercase fw-bold"><i class="mdi mdi-clock-outline"></i> Just Now</p>
                </div>
            </div>
        </div>
    </a>`;
    $("#notification-container a").prepend(newNotification);
    $(".noti-dot").css("opacity", "1");
  }
}
var userId = document
  .querySelector('meta[name="user-id"]')
  .getAttribute("content");
Echo.private("App.Models.User." + userId).listen(
  "UserNotification",
  (event) => {
    if (document.hidden) {
      sendBrowserNotification(event.message.title);
    } else {
      showNotification("info", event.message.title, event.message.body);
    }
  }
);
 
function sendBrowserNotification(title) {
  if ("Notification" in window) {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        audio.play();
        new Notification(title);
      }
    });
  }
}
function getCSRFToken() {
  const csrfMetaTag = document.querySelector('meta[name="csrf-token"]');
  return csrfMetaTag ? csrfMetaTag.content : null;
}
async function validatePassword() {
  let isPasswordCorrect = false;
  while (!isPasswordCorrect) {
    const password = prompt("Zəhmət olmasa şifrəni daxil edin: ");
    if (password === null || password.trim() === "") {
      continue;
    }
    try {
      const response = await fetch("/validate-ajax", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": getCSRFToken(),
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      if (data.data) {
        isPasswordCorrect = true;
      } else {
      }
    } catch (error) {
      console.error("Password validation error:", error.message);
    }
  }
}
function checkTL() {
  fetch("/tl")
    .then((response) => response.json())
    .then((data) => {
      if (data.data) {
        isLocked = true;
        validatePassword();
      }
    })
    .catch((error) => {
      console.error("TL check error:", error.message);
    });
}
function resetInteractionCount() {
  interactionCount = 0;
}
$(document).on("mousemove keydown", resetInteractionCount);
resetInteractionCount();
// function sendGetRequest() {
//   interactionCount += 30;
//   if (interactionCount < 300) {
//     fetch("/timestamp")
//       .then((response) => {})
//       .catch((error) => {});
//   }
// }
// setInterval(sendGetRequest, 30000);
const globalSocket = Echo.private("global-socket." + userId);
globalSocket.listen("ProtectorEvent", (event) => {
  if (event.data && event.data.lock === "true") {
    checkTL();
  }
});
