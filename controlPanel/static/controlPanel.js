
(function() {
  'use strict';
  window.addEventListener('load', async function() {
    initControlPanel();
    setupFormValidation();
  }, false);
})();

function initControlPanel(){

  document
    .getElementById('send')
    .addEventListener('click', async (e) => {
      var message = document.getElementById('send-message').value
      var command = {
        "target" : 0,
        "command" : "nping_icmp_oneshot",
        "parameters" : {
          "message" : message
        }
      };
      await fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });

  document
    .getElementById('print-toggle')
    .addEventListener('change', async (e) => {
      var command = {
        "target" : 0,
        "set" : {
          "parameter" : "print",
          "value" : e.target.checked
        }
      };
      await fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });

  document
    .getElementById('color-toggle')
    .addEventListener('change', async (e) => {
      var command = {
        "target": 0,
        "set" : {
          "parameter" : "color",
          "value" : e.target.checked
        }
      };
      await fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });

  document
    .getElementById('character-toggle')
    .addEventListener('change', async (e) => {
      var command = {
        "target" : 0,
        "set" : {
          "parameter" : "control_characters",
          "value" : e.target.checked
        }
      };
      await fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });

  document
    .getElementById('shift-range')
    .addEventListener('input', async (e) => {
      var command = {
        "target" : 0,
        "set" : {
          "parameter" : "color_shift",
          "value" : e.target.value
        }
      };
      await fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });

  document
    .getElementById('monitor-toggle')
    .addEventListener('change', async (e) => {
      var command = {
        "target" : 0,
        "set" : {
          "parameter" : "wlan1_monitor_mode",
          "value" : e.target.checked
        }
      };
      await fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });

  document
    .getElementById('channel-range')
    .addEventListener('input', async (e) => {
      var command = {
        "target" : 0,
        "set" : {
          "parameter" : "wlan1_channel",
          "value" : e.target.value
        }
      };
      await fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });
}

function setupFormValidation(){
  var forms = document.getElementsByClassName('needs-validation');
  // Loop over them and prevent submission
  var validation = Array.prototype.filter.call(forms, function(form) {
    form.addEventListener('submit', function(event) {
      if (form.checkValidity() === false) {
        event.preventDefault();
        event.stopPropagation();
      }
      form.classList.add('was-validated');
    }, false);
  });
}