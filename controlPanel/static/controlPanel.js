var masterToneIntervalEnabled;
var masterMessageIntervalEnabled;
var masterChannelIntervalEnabled;
var masterShiftIntervalEnabled;

var prey01ToneIntervalEnabled;
var prey01MessageIntervalEnabled;
var prey01ChannelIntervalEnabled;
var prey01ShiftIntervalEnabled;

var prey02ToneIntervalEnabled;
var prey02MessageIntervalEnabled;
var prey02ChannelIntervalEnabled;
var prey02ShiftIntervalEnabled;

var prey03ToneIntervalEnabled;
var prey03MessageIntervalEnabled;
var prey03ChannelIntervalEnabled;
var prey03ShiftIntervalEnabled;


(function() {
  'use strict';
  window.addEventListener('load', async function() {
    initControlPanel();
  }, false);
})();

function initControlPanel(){

  // EVENT LISTENERS

  //MASTER PRINT
  document
    .getElementById('master-print-toggle')
    .addEventListener('change', async (e) => {
      var toggle;
      toggle = document.getElementById('prey01-print-toggle');
      toggle.checked = e.target.checked;
      toggle.dispatchEvent(new Event('change'));
      toggle = document.getElementById('prey02-print-toggle');
      toggle.checked = e.target.checked;
      toggle.dispatchEvent(new Event('change'));
      toggle = document.getElementById('prey03-print-toggle');
      toggle.checked = e.target.checked;
      toggle.dispatchEvent(new Event('change'));
    });

  //PREY PRINT
  document
    .getElementById('prey01-print-toggle')
    .addEventListener('change', async (e) => {
      var command = {
        "target" : 1,
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
    .getElementById('prey02-print-toggle')
    .addEventListener('change', async (e) => {
      var command = {
        "target" : 2,
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
    .getElementById('prey03-print-toggle')
    .addEventListener('change', async (e) => {
      var command = {
        "target" : 3,
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

  //MASTER COLOR
  document
    .getElementById('master-color-toggle')
    .addEventListener('change', async (e) => {
      var toggle;
      toggle = document.getElementById('prey01-color-toggle');
      toggle.checked = e.target.checked;
      toggle.dispatchEvent(new Event('change'));
      toggle = document.getElementById('prey02-color-toggle');
      toggle.checked = e.target.checked;
      toggle.dispatchEvent(new Event('change'));
      toggle = document.getElementById('prey03-color-toggle');
      toggle.checked = e.target.checked;
      toggle.dispatchEvent(new Event('change'));
    });

  //PREY COLOR
  document
    .getElementById('prey01-color-toggle')
    .addEventListener('change', async (e) => {
      var command = {
        "target": 1,
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
    .getElementById('prey02-color-toggle')
    .addEventListener('change', async (e) => {
      var command = {
        "target": 2,
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
    .getElementById('prey03-color-toggle')
    .addEventListener('change', async (e) => {
      var command = {
        "target": 3,
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

  //MASTER SPECIAL CHARACTERS
  document
    .getElementById('master-character-toggle')
    .addEventListener('change', async (e) => {
      var toggle;
      toggle = document.getElementById('prey01-character-toggle');
      toggle.checked = e.target.checked;
      toggle.dispatchEvent(new Event('change'));
      toggle = document.getElementById('prey02-character-toggle');
      toggle.checked = e.target.checked;
      toggle.dispatchEvent(new Event('change'));
      toggle = document.getElementById('prey03-character-toggle');
      toggle.checked = e.target.checked;
      toggle.dispatchEvent(new Event('change'));
    });

  //PREY SPECIAL CHARACTERS
  document
    .getElementById('prey01-character-toggle')
    .addEventListener('change', async (e) => {
      var command = {
        "target" : 1,
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
    .getElementById('prey02-character-toggle')
    .addEventListener('change', async (e) => {
      var command = {
        "target" : 2,
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
    .getElementById('prey03-character-toggle')
    .addEventListener('change', async (e) => {
      var command = {
        "target" : 3,
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

  //MASTER COLOR SHIFT
  document
    .getElementById('master-color-shift-range')
    .addEventListener('input', async (e) => {
      document.getElementById('master-color-shift').textContent=e.target.value;
      
      var range;
      range = document.getElementById('prey01-color-shift-range')
      range.value = e.target.value;
      range.dispatchEvent(new Event('input'));
      range = document.getElementById('prey02-color-shift-range')
      range.value = e.target.value;
      range.dispatchEvent(new Event('input'));
      range = document.getElementById('prey03-color-shift-range')
      range.value = e.target.value;
      range.dispatchEvent(new Event('input'));
      
    });

  //PREY COLOR SHIFT
  document
    .getElementById('prey01-color-shift-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey01-color-shift').textContent=e.target.value;
      var command = {
        "target" : 1,
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
    .getElementById('prey02-color-shift-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey02-color-shift').textContent=e.target.value;
      var command = {
        "target" : 2,
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
    .getElementById('prey03-color-shift-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey02-color-shift').textContent=e.target.value;
      var command = {
        "target" : 3,
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

  //MASTER COLOR SHIFT INTERVAL
  document
    .getElementById('master-shift-interval-range')
    .addEventListener('input', async (e) => {
      document.getElementById('master-shift-interval').textContent=e.target.value;
    });
  document
    .getElementById('master-shift-interval-toggle')
    .addEventListener('change', async (e) => {
      masterShiftIntervalEnabled = document.getElementById('master-shift-interval-toggle').checked;
      if(masterShiftIntervalEnabled){
        masterShiftInterval();
      }
    });

  //PREY COLOR SHIFT INTERVALS
  document
    .getElementById('prey01-shift-interval-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey01-shift-interval').textContent=e.target.value;
    });
  document
    .getElementById('prey01-shift-interval-toggle')
    .addEventListener('change', async (e) => {
      prey01ShiftIntervalEnabled = document.getElementById('prey01-shift-interval-toggle').checked;
      if(prey01ShiftIntervalEnabled){
        prey01ShiftInterval();
      }
    });

  document
    .getElementById('prey02-shift-interval-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey02-shift-interval').textContent=e.target.value;
    });
  document
    .getElementById('prey02-shift-interval-toggle')
    .addEventListener('change', async (e) => {
      prey02ShiftIntervalEnabled = document.getElementById('prey02-shift-interval-toggle').checked;
      if(prey02ShiftIntervalEnabled){
        prey02ShiftInterval();
      }
    });

  document
    .getElementById('prey03-shift-interval-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey03-shift-interval').textContent=e.target.value;
    });
  document
    .getElementById('prey03-shift-interval-toggle')
    .addEventListener('change', async (e) => {
      prey03ShiftIntervalEnabled = document.getElementById('prey03-shift-interval-toggle').checked;
      if(prey03ShiftIntervalEnabled){
        prey03ShiftInterval();
      }
    });

  //MASTER MONITOR MODE TOGGLE
  document
    .getElementById('master-monitor-toggle')
    .addEventListener('change', async (e) => {
      var toggle;
      toggle = document.getElementById('prey01-monitor-toggle');
      toggle.checked = e.target.checked;
      toggle.dispatchEvent(new Event('change'));
      toggle = document.getElementById('prey02-monitor-toggle');
      toggle.checked = e.target.checked;
      toggle.dispatchEvent(new Event('change'));
      toggle = document.getElementById('prey03-monitor-toggle');
      toggle.checked = e.target.checked;
      toggle.dispatchEvent(new Event('change'));
    });

  //PREY MONITOR MODE TOGGLES
  document
    .getElementById('prey01-monitor-toggle')
    .addEventListener('change', async (e) => {
      var command = {
        "target" : 1,
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
    .getElementById('prey02-monitor-toggle')
    .addEventListener('change', async (e) => {
      var command = {
        "target" : 2,
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
    .getElementById('prey03-monitor-toggle')
    .addEventListener('change', async (e) => {
      var command = {
        "target" : 3,
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

  //MASTER WLAN1 CHANNEL RANGE
  document
    .getElementById('master-channel-range')
    .addEventListener('input', async (e) => {
      document.getElementById('master-channel').textContent=e.target.value;
      var range;
      range = document.getElementById('prey01-channel-range');
      range.value = e.target.value;
      range.dispatchEvent(new Event('input'));
      range = document.getElementById('prey02-channel-range');
      range.value = e.target.value;
      range.dispatchEvent(new Event('input'));
      range = document.getElementById('prey03-channel-range');
      range.value = e.target.value;
      range.dispatchEvent(new Event('input'));
    });

  //PREY WLAN1 CHANNEL RANGE
  document
    .getElementById('prey01-channel-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey01-channel').textContent=e.target.value;
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
  document
    .getElementById('prey02-channel-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey02-channel').textContent=e.target.value;
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
  document
    .getElementById('prey03-channel-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey03-channel').textContent=e.target.value;
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

  //MASTER WLAN1 CHANNEL INTERVAL
  document
    .getElementById('master-channel-interval-range')
    .addEventListener('input', async (e) => {
      document.getElementById('master-channel-interval').textContent=e.target.value;
    });
  document
    .getElementById('master-channel-interval-toggle')
    .addEventListener('change', async (e) => {
      masterChannelIntervalEnabled = document.getElementById('master-channel-interval-toggle').checked;
      if(masterChannelIntervalEnabled){
        masterChannelInterval();
      }
    });

  //PREY WLAN1 CHANNEL INTERVALS
  document
    .getElementById('prey01-channel-interval-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey01-channel-interval').textContent=e.target.value;
    });
  document
    .getElementById('prey01-channel-interval-toggle')
    .addEventListener('change', async (e) => {
      prey01ChannelIntervalEnabled = document.getElementById('prey01-channel-interval-toggle').checked;
      if(prey01ChannelIntervalEnabled){
        prey01ChannelInterval();
      }
    });

  document
    .getElementById('prey02-channel-interval-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey02-channel-interval').textContent=e.target.value;
    });
  document
    .getElementById('prey02-channel-interval-toggle')
    .addEventListener('change', async (e) => {
      prey02ChannelIntervalEnabled = document.getElementById('prey02-channel-interval-toggle').checked;
      if(prey02ChannelIntervalEnabled){
        prey02ChannelInterval();
      }
    });

  document
    .getElementById('prey03-channel-interval-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey03-channel-interval').textContent=e.target.value;
    });
  document
    .getElementById('prey03-channel-interval-toggle')
    .addEventListener('change', async (e) => {
      prey03ChannelIntervalEnabled = document.getElementById('prey03-channel-interval-toggle').checked;
      if(prey03ChannelIntervalEnabled){
        prey03ChannelInterval();
      }
    });

  // MASTER MESSAGE SEND
  document
    .getElementById('master-message-button')
    .addEventListener('click', async (e) => {
      var message = document.getElementById('master-message-content').value
      for(var i = 0; i < 3 ; i++){
        var command = {
          "target" : i+1,
          "command" : "nping_icmp_oneshot",
          "parameters" : {
            "message" : message
          }
        };
        await fetch('/', {
          method: "POST",
          body: JSON.stringify(command)
        });
      }
    });

   // PREY MESSAGE SEND
  document
    .getElementById('prey01-message-button')
    .addEventListener('click', async (e) => {
      var message = document.getElementById('prey01-message-content').value
      var command = {
        "target" : 1,
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
    .getElementById('prey02-message-button')
    .addEventListener('click', async (e) => {
      var message = document.getElementById('prey02-message-content').value
      var command = {
        "target" : 2,
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
    .getElementById('prey03-message-button')
    .addEventListener('click', async (e) => {
      var message = document.getElementById('prey03-message-content').value
      var command = {
        "target" : 3,
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

  // MASTER MESSAGE SEND INTERVAL
  document
    .getElementById('master-message-interval-range')
    .addEventListener('input', async (e) => {
      document.getElementById('master-message-interval').textContent=e.target.value;
    });
  document
    .getElementById('master-message-interval-toggle')
    .addEventListener('change', async (e) => {
      masterMessageIntervalEnabled = document.getElementById('master-message-interval-toggle').checked;
      if(masterMessageIntervalEnabled){
        masterMessageInterval();
      }
    });

  // PREY MESSAGE SEND INTERVALS
  document
    .getElementById('prey01-message-interval-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey01-message-interval').textContent=e.target.value;
    });
  document
    .getElementById('prey01-message-interval-toggle')
    .addEventListener('change', async (e) => {
      prey01MessageIntervalEnabled = document.getElementById('prey01-message-interval-toggle').checked;
      if(prey01MessageIntervalEnabled){
        prey01MessageInterval();
      }
    });

  document
    .getElementById('prey02-message-interval-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey02-message-interval').textContent=e.target.value;
    });
  document
    .getElementById('prey02-message-interval-toggle')
    .addEventListener('change', async (e) => {
      prey02MessageIntervalEnabled = document.getElementById('prey02-message-interval-toggle').checked;
      if(prey02MessageIntervalEnabled){
        prey02MessageInterval();
      }
    });

  document
    .getElementById('prey03-message-interval-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey03-message-interval').textContent=e.target.value;
    });
  document
    .getElementById('prey03-message-interval-toggle')
    .addEventListener('change', async (e) => {
      prey03MessageIntervalEnabled = document.getElementById('prey03-message-interval-toggle').checked;
      if(prey03MessageIntervalEnabled){
        prey03MessageInterval();
      }
    });


  //MASTER FLOOD
  document
    .getElementById('master-message-flood-delay-range')
    .addEventListener('input', async (e) => {
      document.getElementById('master-message-flood-delay').textContent = e.target.value;
    });
  document
    .getElementById('master-message-flood-count-range')
    .addEventListener('input', async (e) => {
      document.getElementById('master-message-flood-count').textContent = e.target.value;
    });
  document
    .getElementById('master-message-flood-button')
    .addEventListener('click', async (e) => {
      var message = document.getElementById('master-message-content').value;
      var delay = document.getElementById('master-message-flood-delay-range').value;
      var count = document.getElementById('master-message-flood-count-range').value;
      for(var i = 0; i < 3 ; i++){
        var command = {
          "target" : i+1,
          "command" : "nping_icmp_flood",
          "parameters" : {
            "message" : message,
            "delay" : delay,
            "count" : count
          }
        };
        await fetch('/', {
          method: "POST",
          body: JSON.stringify(command)
        });
      }
    });

  //PREY FLOODS
  document
    .getElementById('prey01-message-flood-delay-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey01-message-flood-delay').textContent = e.target.value;
    });
  document
    .getElementById('prey01-message-flood-count-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey01-message-flood-count').textContent = e.target.value;
    });
  document
    .getElementById('prey01-message-flood-button')
    .addEventListener('click', async (e) => {
      var message = document.getElementById('prey01-message-content').value;
      var delay = document.getElementById('prey01-message-flood-delay-range').value;
      var count = document.getElementById('prey01-message-flood-count-range').value;
      var command = {
        "target" : 1,
        "command" : "nping_icmp_flood",
        "parameters" : {
          "message" : message,
          "delay" : delay,
          "count" : count
        }
      };
      await fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });

  document
    .getElementById('prey02-message-flood-delay-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey02-message-flood-delay').textContent = e.target.value;
    });
  document
    .getElementById('prey02-message-flood-count-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey02-message-flood-count').textContent = e.target.value;
    });
  document
    .getElementById('prey02-message-flood-button')
    .addEventListener('click', async (e) => {
      var message = document.getElementById('prey02-message-content').value;
      var delay = document.getElementById('prey02-message-flood-delay-range').value;
      var count = document.getElementById('prey02-message-flood-count-range').value;
      var command = {
        "target" : 2,
        "command" : "nping_icmp_flood",
        "parameters" : {
          "message" : message,
          "delay" : delay,
          "count" : count
        }
      };
      await fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });

  document
    .getElementById('prey03-message-flood-delay-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey03-message-flood-delay').textContent = e.target.value;
    });
  document
    .getElementById('prey03-message-flood-count-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey03-message-flood-count').textContent = e.target.value;
    });
  document
    .getElementById('prey03-message-flood-button')
    .addEventListener('click', async (e) => {
      var message = document.getElementById('prey03-message-content').value;
      var delay = document.getElementById('prey03-message-flood-delay-range').value;
      var count = document.getElementById('prey03-message-flood-count-range').value;
      var command = {
        "target" : 3,
        "command" : "nping_icmp_flood",
        "parameters" : {
          "message" : message,
          "delay" : delay,
          "count" : count
        }
      };
      await fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });

  // MASTER TONE EVENT LISTENERS

  document
    .getElementById('master-frequency-range')
    .addEventListener('input', async (e) => {
      document.getElementById('master-frequency').textContent=e.target.value;
    });
  document
    .getElementById('master-duration-range')
    .addEventListener('input', async (e) => {
      document.getElementById('master-duration').textContent=e.target.value;
    });
  document
    .getElementById('master-tone-button')
    .addEventListener('click', async (e) => {
      var frequency = document.getElementById('master-frequency-range').value;
      var duration = document.getElementById('master-duration-range').value;
      var shape = document.getElementById('master-shape-select').value;
      for(var i = 0; i < 3 ;i++){
        var command = {
          "target" : i+1,
          "command" : "tone",
          "parameters" : {
            "frequency":frequency,
            "amplitude":1.0,
            "duration":duration,
            "shape":shape
          }
        };
        await fetch('/', {
          method: "POST",
          body: JSON.stringify(command)
        });
      }
    });
  document
    .getElementById('master-tone-interval-range')
    .addEventListener('input', async (e) => {
      document.getElementById('master-tone-interval').textContent=e.target.value;
    });
  document
    .getElementById('master-tone-interval-toggle')
    .addEventListener('change', async (e) => {
      masterToneIntervalEnabled = document.getElementById('master-tone-interval-toggle').checked;
      if(masterToneIntervalEnabled){
        masterToneInterval();
      }
    });

  // PREY TONE EVENT LISTENERS
  document
    .getElementById('prey01-frequency-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey01-frequency').textContent=e.target.value;
    });
  document
    .getElementById('prey01-duration-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey01-duration').textContent=e.target.value;
    });
  document
    .getElementById('prey01-tone-button')
    .addEventListener('click', async (e) => {
      var frequency = document.getElementById('prey01-frequency-range').value;
      var duration = document.getElementById('prey01-duration-range').value;
      var shape = document.getElementById('prey01-shape-select').value;
      var command = {
        "target" : 1,
        "command" : "tone",
        "parameters" : {
          "frequency":frequency,
          "amplitude":1.0,
          "duration":duration,
          "shape":shape
        }
      };
      await fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });
  document
    .getElementById('prey01-tone-interval-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey01-tone-interval').textContent=e.target.value;
    });
  document
    .getElementById('prey01-tone-interval-toggle')
    .addEventListener('change', async (e) => {
      prey01ToneIntervalEnabled = document.getElementById('prey01-tone-interval-toggle').checked;
      if(prey01ToneIntervalEnabled){
        prey01ToneInterval();
      }
    });

  document
    .getElementById('prey02-frequency-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey02-frequency').textContent=e.target.value;
    });
  document
    .getElementById('prey02-duration-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey02-duration').textContent=e.target.value;
    });
  document
    .getElementById('prey02-tone-button')
    .addEventListener('click', async (e) => {
      var frequency = document.getElementById('prey02-frequency-range').value;
      var duration = document.getElementById('prey02-duration-range').value;
      var shape = document.getElementById('prey02-shape-select').value;
      var command = {
        "target" : 2,
        "command" : "tone",
        "parameters" : {
          "frequency":frequency,
          "amplitude":1.0,
          "duration":duration,
          "shape":shape
        }
      };
      await fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });
  document
    .getElementById('prey02-tone-interval-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey02-tone-interval').textContent=e.target.value;
    });
  document
    .getElementById('prey02-tone-interval-toggle')
    .addEventListener('change', async (e) => {
      prey02ToneIntervalEnabled = document.getElementById('prey02-tone-interval-toggle').checked;
      if(prey02ToneIntervalEnabled){
        prey02ToneInterval();
      }
    });

  document
    .getElementById('prey03-frequency-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey03-frequency').textContent=e.target.value;
    });
  document
    .getElementById('prey03-duration-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey03-duration').textContent=e.target.value;
    });
  document
    .getElementById('prey03-tone-button')
    .addEventListener('click', async (e) => {
      var frequency = document.getElementById('prey03-frequency-range').value;
      var duration = document.getElementById('prey03-duration-range').value;
      var shape = document.getElementById('prey03-shape-select').value;
      var command = {
        "target" : 3,
        "command" : "tone",
        "parameters" : {
          "frequency":frequency,
          "amplitude":1.0,
          "duration":duration,
          "shape":shape
        }
      };
      await fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });
  document
    .getElementById('prey03-tone-interval-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey03-tone-interval').textContent=e.target.value;
    });
  document
    .getElementById('prey03-tone-interval-toggle')
    .addEventListener('change', async (e) => {
      prey03ToneIntervalEnabled = document.getElementById('prey03-tone-interval-toggle').checked;
      if(prey03ToneIntervalEnabled){
        prey03ToneInterval();
      }
    });

}


// MASTER Intervals
function masterShiftInterval(){
  if(masterShiftIntervalEnabled){
    var interval = Math.round(document.getElementById('master-shift-interval-range').value);
    
    var range = document.getElementById('master-color-shift-range');
    range.value = Math.round(255*Math.random());
    range.dispatchEvent(new Event('input'));

    setTimeout(masterShiftInterval, interval);
  }
}

function masterChannelInterval(){
  if(masterChannelIntervalEnabled){
    var interval = Math.round(document.getElementById('master-channel-interval-range').value);
    
    var range = document.getElementById('master-channel-range');
    range.value = Math.round(13*Math.random());
    range.dispatchEvent(new Event('input'));

    setTimeout(masterChannelInterval, interval);
  }
}

function masterToneInterval(){
  if(masterToneIntervalEnabled){
    var interval = Math.round(document.getElementById('master-tone-interval-range').value);
    document
      .getElementById('master-tone-button')
      .click();
    setTimeout(masterToneInterval, interval);
  }
}

function masterMessageInterval(){
  if(masterMessageIntervalEnabled){
    var interval = Math.round(document.getElementById('master-message-interval-range').value);
    document
      .getElementById('master-message-button')
      .click();
    setTimeout(masterMessageInterval, interval);
  }
}

// PREY01 Intervals
function prey01ShiftInterval(){
  if(prey01ShiftIntervalEnabled){
    var interval = Math.round(document.getElementById('prey01-shift-interval-range').value);
    
    var range = document.getElementById('prey01-color-shift-range');
    range.value = Math.round(255*Math.random());
    range.dispatchEvent(new Event('input'));

    setTimeout(prey01ShiftInterval, interval);
  }
}

function prey01ChannelInterval(){
  if(prey01ChannelIntervalEnabled){
    var interval = Math.round(document.getElementById('prey01-channel-interval-range').value);
    
    var range = document.getElementById('prey01-channel-range');
    range.value = Math.round(13*Math.random());
    range.dispatchEvent(new Event('input'));

    setTimeout(prey01ChannelInterval, interval);
  }
}

function prey01ToneInterval(){
  if(prey01ToneIntervalEnabled){
    var interval = Math.round(document.getElementById('prey01-tone-interval-range').value);
    document
      .getElementById('prey01-tone-button')
      .click();
    setTimeout(prey01ToneInterval, interval);
  }
}

function prey01MessageInterval(){
  if(prey01MessageIntervalEnabled){
    var interval = Math.round(document.getElementById('prey01-message-interval-range').value);
    document
      .getElementById('prey01-message-button')
      .click();
    setTimeout(prey01MessageInterval, interval);
  }
}

// PREY02 Intervals
function prey02ShiftInterval(){
  if(prey02ShiftIntervalEnabled){
    var interval = Math.round(document.getElementById('prey02-shift-interval-range').value);
    
    var range = document.getElementById('prey02-color-shift-range');
    range.value = Math.round(255*Math.random());
    range.dispatchEvent(new Event('input'));

    setTimeout(prey02ShiftInterval, interval);
  }
}

function prey02ChannelInterval(){
  if(prey02ChannelIntervalEnabled){
    var interval = Math.round(document.getElementById('prey02-channel-interval-range').value);
    
    var range = document.getElementById('prey02-channel-range');
    range.value = Math.round(13*Math.random());
    range.dispatchEvent(new Event('input'));

    setTimeout(prey02ChannelInterval, interval);
  }
}

function prey02ToneInterval(){
  if(prey02ToneIntervalEnabled){
    var interval = Math.round(document.getElementById('prey02-tone-interval-range').value);
    document
      .getElementById('prey02-tone-button')
      .click();
    setTimeout(prey02ToneInterval, interval);
  }
}

function prey02MessageInterval(){
  if(prey02MessageIntervalEnabled){
    var interval = Math.round(document.getElementById('prey02-message-interval-range').value);
    document
      .getElementById('prey02-message-button')
      .click();
    setTimeout(prey02MessageInterval, interval);
  }
}

// PREY02 Intervals
function prey03ShiftInterval(){
  if(prey03ShiftIntervalEnabled){
    var interval = Math.round(document.getElementById('prey03-shift-interval-range').value);
    
    var range = document.getElementById('prey03-color-shift-range');
    range.value = Math.round(255*Math.random());
    range.dispatchEvent(new Event('input'));

    setTimeout(prey03ShiftInterval, interval);
  }
}

function prey03ChannelInterval(){
  if(prey03ChannelIntervalEnabled){
    var interval = Math.round(document.getElementById('prey03-channel-interval-range').value);
    
    var range = document.getElementById('prey03-channel-range');
    range.value = Math.round(13*Math.random());
    range.dispatchEvent(new Event('input'));

    setTimeout(prey03ChannelInterval, interval);
  }
}

function prey03ToneInterval(){
  if(prey03ToneIntervalEnabled){
    var interval = Math.round(document.getElementById('prey03-tone-interval-range').value);
    document
      .getElementById('prey03-tone-button')
      .click();
    setTimeout(prey03ToneInterval, interval);
  }
}

function prey03MessageInterval(){
  if(prey03MessageIntervalEnabled){
    var interval = Math.round(document.getElementById('prey03-message-interval-range').value);
    document
      .getElementById('prey03-message-button')
      .click();
    setTimeout(prey03MessageInterval, interval);
  }
}