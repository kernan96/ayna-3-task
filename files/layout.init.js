$(document).ready(function () {
  let pageContainer = document.querySelector(".page-container");
  if (pageContainer) {
    pageContainer.style.display = "none";
  }
  const links = document.querySelectorAll("a");
  links.forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      function harfAra(kelime, hedefHarf) {
        return kelime.includes(hedefHarf);
      }
      const href = link.getAttribute("href");
      const target = link.getAttribute("target"); // target atributunu al
      if (target === "_blank") {
        if (
          href &&
          href !== "#" &&
          href !== "" &&
          !harfAra(href, "#") &&
          !harfAra(href, "javascript") &&
          !harfAra(href, "mailto") &&
          !harfAra(href, "tel")
        ) {
          window.open(href, "_blank"); 
        }
      } else {
        if (
          href &&
          href !== "#" &&
          href !== "" &&
          !harfAra(href, "#") &&
          !harfAra(href, "javascript") &&
          !harfAra(href, "mailto") &&
          !harfAra(href, "tel")
        ) {
          let containerSe = document.querySelector(".page-container");
          if (containerSe) {
            containerSe.style.display = "block";
            window.location.href = href; 
          }
        }
      }
    });
  });
  let timeout;
  $(document).on("change", ".institution-select", function () {
    clearTimeout(timeout);
    const selectedInstitution = $(this).val();
    let personSelect = $(this).closest(".search_div").find(".person-select");
    if (personSelect.length === 0) {
      personSelect = $(this).closest(".row").find(".person-select");
    }
    timeout = setTimeout(function () {
      $.ajax({
        url: "/organizations/tools/get/persons/" + selectedInstitution,
        type: "GET",
        dataType: "json",
        success: function (data) {
          personSelect.empty();
          const option = $("<option>", {
            value: "",
            text: "Seçin",
          });
          personSelect.append(option);
          $.each(data, function (key, value) {
            personSelect.append(
              $("<option>", {
                value: key,
                text: value,
              })
            );
          });
          $(personSelect).chosen();
          personSelect.trigger("chosen:updated");
        },
        error: function (xhr, status, error) {},
      });
    }, 0);
  });
});
function generateRandomCode(length) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
function dataref(url, data) {
  $.ajax({
    url: url,
    type: "GET",
    data: {
      data: data,
      hashKey: generateRandomCode(50),
    },
    success: function (response) {
      $(".dynamic-modal-body").html(response.html);
      $(".modal-title").text(response.title);
      if (response.size) {
        $("#data .modal-dialog")
          .removeClass("modal-xl modal-xxl modal-lg modal-sm")
          .addClass("modal-" + response.size);
      }
    },
  });
  $("#data")
    .modal({
      backdrop: true,
      show: true,
    })
    .modal("show");
  $("#data").on("hidden.bs.modal", function () {
    $(this)
      .find(".dynamic-modal-body")
      .html(
        `<div style="width: 100%; height: 100%; display:flex; justify-content:center">
                <div style="bottom: 45%; right: 48%; background: transparent;">
                    <div style="width: 70px; height: 70px; border-radius: 50%; -webkit-box-sizing: border-box; box-sizing: border-box; border: solid 2px #6690F4; border-top-color: #fff; animation: spin 1s infinite linear; -webkit-animation: spin 1s infinite linear; display: inline-block;"></div>
                </div>
            </div>`
      );
  });
}

$(".close_modal").click(function () {
  $("#data").modal("hide");
  $(this)
    .find(".dynamic-modal-body")
    .html(
      `<div style="width: 100%; height: 100%; display:flex; justify-content:center">
                <div style="bottom: 45%; right: 48%; background: transparent;">
                    <div style="width: 70px; height: 70px; border-radius: 50%; -webkit-box-sizing: border-box; box-sizing: border-box; border: solid 2px #6690F4; border-top-color: #fff; animation: spin 1s infinite linear; -webkit-animation: spin 1s infinite linear; display: inline-block;"></div>
                </div>
        </div>`
    );
});
document.addEventListener("DOMContentLoaded", function () {
  function saveCheckboxState(checkboxGroupName) {
    var checkboxes = document.querySelectorAll(
      'input[type="radio"][name="' + checkboxGroupName + '"]'
    );
    checkboxes.forEach(function (checkbox) {
      localStorage.setItem(
        checkboxGroupName + "_" + checkbox.value,
        checkbox.checked
      );
    });
  }
  document
    .querySelectorAll(
      'input[type="radio"][name="layout-mode"], input[type="radio"][name="layout-width"], input[type="radio"][name="layout-position"], input[type="radio"][name="sidebar-size"]'
    )
    .forEach(function (radioButton) {
      radioButton.addEventListener("change", function () {
        sendAjaxRequest();
      });
    });
  document.querySelector(".btn-sm").addEventListener("click", function () {
    var currentSidebarSize = "lg";
    var csrfToken = $('meta[name="csrf-token"]').attr("content");
    $.ajax({
      url: "/update-sidebar-size",
      method: "POST",
      headers: {
        "X-CSRF-TOKEN": csrfToken,
      },
      data: {
        sidebarSize: currentSidebarSize,
      },
      success: function (response) {},
      error: function (error) {},
    });
  });
  document.querySelector(".btn-lg").addEventListener("click", function () {
    var currentSidebarSize = "sm";
    var csrfToken = $('meta[name="csrf-token"]').attr("content");
    $.ajax({
      url: "/update-sidebar-size",
      method: "POST",
      headers: {
        "X-CSRF-TOKEN": csrfToken,
      },
      data: {
        sidebarSize: currentSidebarSize,
      },
      success: function (response) {},
      error: function (error) {},
    });
  });
  function sendAjaxRequest() {
    var layoutModeInput = document.querySelector(
      'input[name="layout-mode"]:checked'
    );
    var layoutWidthInput = document.querySelector(
      'input[name="layout-width"]:checked'
    );
    var layoutPositionInput = document.querySelector(
      'input[name="layout-position"]:checked'
    );
    var sidebarSizeInput = document.querySelector(
      'input[name="sidebar-size"]:checked'
    );

    var layoutModeValue = layoutModeInput ? layoutModeInput.value : null;
    var layoutWidthValue = layoutWidthInput ? layoutWidthInput.value : null;
    var layoutPositionValue = layoutPositionInput
      ? layoutPositionInput.value
      : null;
    var sidebarSizeValue = sidebarSizeInput ? sidebarSizeInput.value : null;
    saveCheckboxState("layout-mode");
    saveCheckboxState("layout-width");
    saveCheckboxState("layout-position");
    saveCheckboxState("sidebar-size");
    if (
      layoutModeValue ||
      layoutWidthValue ||
      layoutPositionValue ||
      sidebarSizeValue
    ) {
      var csrfToken = $('meta[name="csrf-token"]').attr("content");
      $.ajax({
        url: "/update-settings",
        method: "POST",
        headers: {
          "X-CSRF-TOKEN": csrfToken,
        },
        data: {
          layoutMode: layoutModeValue,
          layoutWidth: layoutWidthValue,
          layoutPosition: layoutPositionValue,
          sidebarSize: sidebarSizeValue,
        },
        success: function (response) {
          if (layoutPositionValue) {
            document.body.setAttribute(
              "data-layout-scrollable",
              layoutPositionValue === "scrollable" ? "true" : "false"
            );
          }
        },
        error: function (error) {},
      });
    } else {
    }
  }
});