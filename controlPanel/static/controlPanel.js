var masterToneIntervalEnabled;
var masterMessageIntervalEnabled;
var masterChannelIntervalEnabled;
var masterShiftIntervalEnabled;

var prey0ToneIntervalEnabled;
var prey0MessageIntervalEnabled;
var prey0ChannelIntervalEnabled;
var prey0ShiftIntervalEnabled;

var prey1ToneIntervalEnabled;
var prey1MessageIntervalEnabled;
var prey1ChannelIntervalEnabled;
var prey1ShiftIntervalEnabled;

var prey2ToneIntervalEnabled;
var prey2MessageIntervalEnabled;
var prey2ChannelIntervalEnabled;
var prey2ShiftIntervalEnabled;

var apLists;

(function() {
  'use strict';
  window.addEventListener('load', async function() {
    await fetchStates();
    apLists = await fetchAPs();
    initControlPanel();
  }, false);
})();


async function fetchAPs(){
  var response = await fetch('/?action=get_aps',{method:"POST"})
  var { apLists } = await response.json();
  for(var i = 0 ; i < apLists.length ; i++){
    var currentSelect = document.getElementById(`prey${i}-ssid-select`);
    var select = document.createElement('select');
    select.setAttribute('class', "form-select my-1");
    select.setAttribute('id',`prey${i}-ssid-select`);
    var keys = Object.keys(apLists[i]);
    if (apLists[i].online){
      for(var j = 0 ; j < keys.length; j++){
        var option = document.createElement('option');
        if(keys[j] !== 'online'){
          option.setAttribute('value',keys[j]);
          option.textContent = `${keys[j]} - ${apLists[i][keys[j]].count}`;
          select.appendChild(option);
        }
      }
    } else {
      option = document.createElement('option');
      option.textContent = 'unreachable';
      select.appendChild(option);
      select.disabled = true;
    }
    select.selectedIndex = 0;
    currentSelect.replaceWith(select);
  }
  return apLists;
}

async function fetchStates(){
  var response = await fetch('/?action=get_states',{method:"POST"})
  var { states } = await response.json();
  for(var i = 0 ; i < states.length ; i++){
    if (states[i].online){
      document.getElementById(`prey${i}-print-toggle`).checked = states[i].print;
      document.getElementById(`prey${i}-color-toggle`).checked = states[i].color;
      document.getElementById(`prey${i}-character-toggle`).checked = states[i].control_characters;
      document.getElementById(`prey${i}-color-shift-range`).value = states[i].color_shift;
      document.getElementById(`prey${i}-color-shift`).textContent = states[i].color_shift;
      document.getElementById(`prey${i}-monitor-toggle`).checked = states[i].wlan1_monitor_mode;
      document.getElementById(`prey${i}-channel-range`).value = states[i].wlan1_channel;
      document.getElementById(`prey${i}-channel`).textContent = states[i].wlan1_channel;
      document.getElementById(`prey${i}-title`).textContent = states[i].ip;
    } else {
      document.getElementById(`prey${i}-title`).textContent = "unreachable";
    }
    
  }
}


function initControlPanel(){

  // EVENT LISTENERS
  document
    .getElementById(`update-status`)
    .addEventListener('click', async (e) => {
      await fetchStates();
    });
  
  document
    .getElementById(`shutdown`)
    .addEventListener('click', async (e) => {
      command = {'shutdown' : true}
      fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });

  // AP Refresh buttons
  for(var i = 0 ; i < 3 ; i++){
    document
    .getElementById(`prey${i}-ssid-button`)
    .addEventListener('click', async (e) => {
      apLists = await fetchAPs();
    });
  }

  //AP enable/disable
  document
    .getElementById(`prey0-ap-toggle`)
    .addEventListener('change', async (e) => {
      var ssid = document.getElementById(`prey0-ssid-select`).value;
      document.getElementById(`prey0-monitor-toggle`).disabled = e.target.checked;
      document.getElementById(`prey0-channel-range`).disabled = e.target.checked;
      var toggle = document.getElementById(`prey0-channel-interval-toggle`);
      toggle.checked = false;
      toggle.disabled = e.target.checked;
      toggle.dispatchEvent(new Event('change'));
      var command 
      if(e.target.checked){
        command = {
          'target' : 0,
          'command' : 'start_ap',
          'parameters' : {
            'SSID' : ssid,
            'channel' : 5,
            'MAC' : apLists[0][ssid].MACs[0]
          }
        }
      } else {
        command = {
          'target' : 0,
          'command' : 'stop_ap',
          'parameters' : {}
        }
      }
      fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });
  document
    .getElementById(`prey1-ap-toggle`)
    .addEventListener('change', async (e) => {
      var ssid = document.getElementById(`prey1-ssid-select`).value;
      document.getElementById(`prey1-monitor-toggle`).disabled = e.target.checked;
      document.getElementById(`prey1-channel-range`).disabled = e.target.checked;
      var toggle = document.getElementById(`prey1-channel-interval-toggle`);
      toggle.checked = false;
      toggle.disabled = e.target.checked;
      toggle.dispatchEvent(new Event('change'));
      var command 
      if(e.target.checked){
        command = {
          'target' : 1,
          'command' : 'start_ap',
          'parameters' : {
            'SSID' : ssid,
            'channel' : 5,
            'MAC' : apLists[1][ssid].MACs[0]
          }
        }
      } else {
        command = {
          'target' : 1,
          'command' : 'stop_ap',
          'parameters' : {}
        }
      }
      fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });
  document
    .getElementById(`prey2-ap-toggle`)
    .addEventListener('change', async (e) => {
      console.log(i)
      var ssid = document.getElementById(`prey2-ssid-select`).value;
      document.getElementById(`prey2-monitor-toggle`).disabled = e.target.checked;
      document.getElementById(`prey2-channel-range`).disabled = e.target.checked;
      var toggle = document.getElementById(`prey2-channel-interval-toggle`);
      toggle.checked = false;
      toggle.disabled = e.target.checked;
      toggle.dispatchEvent(new Event('change'));
      var command 
      if(e.target.checked){
        command = {
          'target' : 2,
          'command' : 'start_ap',
          'parameters' : {
            'SSID' : ssid,
            'channel' : 5,
            'MAC' : apLists[2][ssid].MACs[0]
          }
        }
      } else {
        command = {
          'target' : 2,
          'command' : 'stop_ap',
          'parameters' : {}
        }
      }
      fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });

  //MASTER PRINT
  document
    .getElementById('master-print-toggle')
    .addEventListener('change', async (e) => {
      var toggle;
      toggle = document.getElementById('prey0-print-toggle');
      toggle.checked = e.target.checked;
      toggle.dispatchEvent(new Event('change'));
      toggle = document.getElementById('prey1-print-toggle');
      toggle.checked = e.target.checked;
      toggle.dispatchEvent(new Event('change'));
      toggle = document.getElementById('prey2-print-toggle');
      toggle.checked = e.target.checked;
      toggle.dispatchEvent(new Event('change'));
    });

  //PREY PRINT
  document
    .getElementById('prey0-print-toggle')
    .addEventListener('change', async (e) => {
      var command = {
        "target" : 0,
        "set" : {
          "parameter" : "print",
          "value" : e.target.checked
        }
      };
      fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });
  document
    .getElementById('prey1-print-toggle')
    .addEventListener('change', async (e) => {
      var command = {
        "target" : 1,
        "set" : {
          "parameter" : "print",
          "value" : e.target.checked
        }
      };
      fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });
  document
    .getElementById('prey2-print-toggle')
    .addEventListener('change', async (e) => {
      var command = {
        "target" : 2,
        "set" : {
          "parameter" : "print",
          "value" : e.target.checked
        }
      };
      fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });

  //MASTER COLOR
  document
    .getElementById('master-color-toggle')
    .addEventListener('change', async (e) => {
      var toggle;
      toggle = document.getElementById('prey0-color-toggle');
      toggle.checked = e.target.checked;
      toggle.dispatchEvent(new Event('change'));
      toggle = document.getElementById('prey1-color-toggle');
      toggle.checked = e.target.checked;
      toggle.dispatchEvent(new Event('change'));
      toggle = document.getElementById('prey2-color-toggle');
      toggle.checked = e.target.checked;
      toggle.dispatchEvent(new Event('change'));
    });

  //PREY COLOR
  document
    .getElementById('prey0-color-toggle')
    .addEventListener('change', async (e) => {
      var command = {
        "target": 0,
        "set" : {
          "parameter" : "color",
          "value" : e.target.checked
        }
      };
      fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });
  document
    .getElementById('prey1-color-toggle')
    .addEventListener('change', async (e) => {
      var command = {
        "target": 1,
        "set" : {
          "parameter" : "color",
          "value" : e.target.checked
        }
      };
      fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });
  document
    .getElementById('prey2-color-toggle')
    .addEventListener('change', async (e) => {
      var command = {
        "target": 2,
        "set" : {
          "parameter" : "color",
          "value" : e.target.checked
        }
      };
      fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });

  //MASTER SPECIAL CHARACTERS
  document
    .getElementById('master-character-toggle')
    .addEventListener('change', async (e) => {
      var toggle;
      toggle = document.getElementById('prey0-character-toggle');
      toggle.checked = e.target.checked;
      toggle.dispatchEvent(new Event('change'));
      toggle = document.getElementById('prey1-character-toggle');
      toggle.checked = e.target.checked;
      toggle.dispatchEvent(new Event('change'));
      toggle = document.getElementById('prey2-character-toggle');
      toggle.checked = e.target.checked;
      toggle.dispatchEvent(new Event('change'));
    });

  //PREY SPECIAL CHARACTERS
  document
    .getElementById('prey0-character-toggle')
    .addEventListener('change', async (e) => {
      var command = {
        "target" : 0,
        "set" : {
          "parameter" : "control_characters",
          "value" : e.target.checked
        }
      };
      fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });
  document
    .getElementById('prey1-character-toggle')
    .addEventListener('change', async (e) => {
      var command = {
        "target" : 1,
        "set" : {
          "parameter" : "control_characters",
          "value" : e.target.checked
        }
      };
      fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });
  document
    .getElementById('prey2-character-toggle')
    .addEventListener('change', async (e) => {
      var command = {
        "target" : 2,
        "set" : {
          "parameter" : "control_characters",
          "value" : e.target.checked
        }
      };
      fetch('/', {
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
      range = document.getElementById('prey0-color-shift-range')
      range.value = e.target.value;
      range.dispatchEvent(new Event('input'));
      range = document.getElementById('prey1-color-shift-range')
      range.value = e.target.value;
      range.dispatchEvent(new Event('input'));
      range = document.getElementById('prey2-color-shift-range')
      range.value = e.target.value;
      range.dispatchEvent(new Event('input'));
      
    });

  //PREY COLOR SHIFT
  document
    .getElementById('prey0-color-shift-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey0-color-shift').textContent=e.target.value;
      var command = {
        "target" : 0,
        "set" : {
          "parameter" : "color_shift",
          "value" : e.target.value
        }
      };
      fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });
  document
    .getElementById('prey1-color-shift-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey1-color-shift').textContent=e.target.value;
      var command = {
        "target" : 1,
        "set" : {
          "parameter" : "color_shift",
          "value" : e.target.value
        }
      };
      fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });
  document
    .getElementById('prey2-color-shift-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey1-color-shift').textContent=e.target.value;
      var command = {
        "target" : 2,
        "set" : {
          "parameter" : "color_shift",
          "value" : e.target.value
        }
      };
      fetch('/', {
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
    .getElementById('prey0-shift-interval-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey0-shift-interval').textContent=e.target.value;
    });
  document
    .getElementById('prey0-shift-interval-toggle')
    .addEventListener('change', async (e) => {
      prey0ShiftIntervalEnabled = document.getElementById('prey0-shift-interval-toggle').checked;
      if(prey0ShiftIntervalEnabled){
        prey0ShiftInterval();
      }
    });

  document
    .getElementById('prey1-shift-interval-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey1-shift-interval').textContent=e.target.value;
    });
  document
    .getElementById('prey1-shift-interval-toggle')
    .addEventListener('change', async (e) => {
      prey1ShiftIntervalEnabled = document.getElementById('prey1-shift-interval-toggle').checked;
      if(prey1ShiftIntervalEnabled){
        prey1ShiftInterval();
      }
    });

  document
    .getElementById('prey2-shift-interval-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey2-shift-interval').textContent=e.target.value;
    });
  document
    .getElementById('prey2-shift-interval-toggle')
    .addEventListener('change', async (e) => {
      prey2ShiftIntervalEnabled = document.getElementById('prey2-shift-interval-toggle').checked;
      if(prey2ShiftIntervalEnabled){
        prey2ShiftInterval();
      }
    });

  //MASTER MONITOR MODE TOGGLE
  document
    .getElementById('master-monitor-toggle')
    .addEventListener('change', async (e) => {
      var toggle;
      toggle = document.getElementById('prey0-monitor-toggle');
      toggle.checked = e.target.checked;
      toggle.dispatchEvent(new Event('change'));
      toggle = document.getElementById('prey1-monitor-toggle');
      toggle.checked = e.target.checked;
      toggle.dispatchEvent(new Event('change'));
      toggle = document.getElementById('prey2-monitor-toggle');
      toggle.checked = e.target.checked;
      toggle.dispatchEvent(new Event('change'));
    });

  //PREY MONITOR MODE TOGGLES
  document
    .getElementById('prey0-monitor-toggle')
    .addEventListener('change', async (e) => {
      var command = {
        "target" : 0,
        "set" : {
          "parameter" : "wlan1_monitor_mode",
          "value" : e.target.checked
        }
      };
      fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });
  document
    .getElementById('prey1-monitor-toggle')
    .addEventListener('change', async (e) => {
      var command = {
        "target" : 1,
        "set" : {
          "parameter" : "wlan1_monitor_mode",
          "value" : e.target.checked
        }
      };
      fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });
  document
    .getElementById('prey2-monitor-toggle')
    .addEventListener('change', async (e) => {
      var command = {
        "target" : 2,
        "set" : {
          "parameter" : "wlan1_monitor_mode",
          "value" : e.target.checked
        }
      };
      fetch('/', {
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
      range = document.getElementById('prey0-channel-range');
      range.value = e.target.value;
      range.dispatchEvent(new Event('input'));
      range = document.getElementById('prey1-channel-range');
      range.value = e.target.value;
      range.dispatchEvent(new Event('input'));
      range = document.getElementById('prey2-channel-range');
      range.value = e.target.value;
      range.dispatchEvent(new Event('input'));
    });

  //PREY WLAN1 CHANNEL RANGE
  document
    .getElementById('prey0-channel-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey0-channel').textContent=e.target.value;
      var command = {
        "target" : 0,
        "set" : {
          "parameter" : "wlan1_channel",
          "value" : e.target.value
        }
      };
      fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });
  document
    .getElementById('prey1-channel-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey1-channel').textContent=e.target.value;
      var command = {
        "target" : 1,
        "set" : {
          "parameter" : "wlan1_channel",
          "value" : e.target.value
        }
      };
      fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });
  document
    .getElementById('prey2-channel-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey2-channel').textContent=e.target.value;
      var command = {
        "target" : 2,
        "set" : {
          "parameter" : "wlan1_channel",
          "value" : e.target.value
        }
      };
      fetch('/', {
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
    .getElementById('prey0-channel-interval-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey0-channel-interval').textContent=e.target.value;
    });
  document
    .getElementById('prey0-channel-interval-toggle')
    .addEventListener('change', async (e) => {
      prey0ChannelIntervalEnabled = document.getElementById('prey0-channel-interval-toggle').checked;
      if(prey0ChannelIntervalEnabled){
        prey0ChannelInterval();
      }
    });

  document
    .getElementById('prey1-channel-interval-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey1-channel-interval').textContent=e.target.value;
    });
  document
    .getElementById('prey1-channel-interval-toggle')
    .addEventListener('change', async (e) => {
      prey1ChannelIntervalEnabled = document.getElementById('prey1-channel-interval-toggle').checked;
      if(prey1ChannelIntervalEnabled){
        prey1ChannelInterval();
      }
    });

  document
    .getElementById('prey2-channel-interval-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey2-channel-interval').textContent=e.target.value;
    });
  document
    .getElementById('prey2-channel-interval-toggle')
    .addEventListener('change', async (e) => {
      prey2ChannelIntervalEnabled = document.getElementById('prey2-channel-interval-toggle').checked;
      if(prey2ChannelIntervalEnabled){
        prey2ChannelInterval();
      }
    });

  // MASTER MESSAGE SEND
  document
    .getElementById('master-message-button')
    .addEventListener('click', async (e) => {
      var message = document.getElementById('master-message-content').value
      for(var i = 0; i < 3 ; i++){
        var command = {
          "target" : i,
          "command" : "nping_icmp_oneshot",
          "parameters" : {
            "message" : message
          }
        };
        fetch('/', {
          method: "POST",
          body: JSON.stringify(command)
        });
      }
    });

   // PREY MESSAGE SEND
  document
    .getElementById('prey0-message-button')
    .addEventListener('click', async (e) => {
      var message = document.getElementById('prey0-message-content').value
      var command = {
        "target" : 0,
        "command" : "nping_icmp_oneshot",
        "parameters" : {
          "message" : message
        }
      };
      fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });
  document
    .getElementById('prey1-message-button')
    .addEventListener('click', async (e) => {
      var message = document.getElementById('prey1-message-content').value
      var command = {
        "target" : 1,
        "command" : "nping_icmp_oneshot",
        "parameters" : {
          "message" : message
        }
      };
      fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });
  document
    .getElementById('prey2-message-button')
    .addEventListener('click', async (e) => {
      var message = document.getElementById('prey2-message-content').value
      var command = {
        "target" : 2,
        "command" : "nping_icmp_oneshot",
        "parameters" : {
          "message" : message
        }
      };
      fetch('/', {
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
    .getElementById('prey0-message-interval-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey0-message-interval').textContent=e.target.value;
    });
  document
    .getElementById('prey0-message-interval-toggle')
    .addEventListener('change', async (e) => {
      prey0MessageIntervalEnabled = document.getElementById('prey0-message-interval-toggle').checked;
      if(prey0MessageIntervalEnabled){
        prey0MessageInterval();
      }
    });

  document
    .getElementById('prey1-message-interval-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey1-message-interval').textContent=e.target.value;
    });
  document
    .getElementById('prey1-message-interval-toggle')
    .addEventListener('change', async (e) => {
      prey1MessageIntervalEnabled = document.getElementById('prey1-message-interval-toggle').checked;
      if(prey1MessageIntervalEnabled){
        prey1MessageInterval();
      }
    });

  document
    .getElementById('prey2-message-interval-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey2-message-interval').textContent=e.target.value;
    });
  document
    .getElementById('prey2-message-interval-toggle')
    .addEventListener('change', async (e) => {
      prey2MessageIntervalEnabled = document.getElementById('prey2-message-interval-toggle').checked;
      if(prey2MessageIntervalEnabled){
        prey2MessageInterval();
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
          "target" : i,
          "command" : "nping_icmp_flood",
          "parameters" : {
            "message" : message,
            "delay" : delay,
            "count" : count
          }
        };
        fetch('/', {
          method: "POST",
          body: JSON.stringify(command)
        });
      }
    });

  //PREY FLOODS
  document
    .getElementById('prey0-message-flood-delay-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey0-message-flood-delay').textContent = e.target.value;
    });
  document
    .getElementById('prey0-message-flood-count-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey0-message-flood-count').textContent = e.target.value;
    });
  document
    .getElementById('prey0-message-flood-button')
    .addEventListener('click', async (e) => {
      var message = document.getElementById('prey0-message-content').value;
      var delay = document.getElementById('prey0-message-flood-delay-range').value;
      var count = document.getElementById('prey0-message-flood-count-range').value;
      var command = {
        "target" : 0,
        "command" : "nping_icmp_flood",
        "parameters" : {
          "message" : message,
          "delay" : delay,
          "count" : count
        }
      };
      fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });

  document
    .getElementById('prey1-message-flood-delay-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey1-message-flood-delay').textContent = e.target.value;
    });
  document
    .getElementById('prey1-message-flood-count-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey1-message-flood-count').textContent = e.target.value;
    });
  document
    .getElementById('prey1-message-flood-button')
    .addEventListener('click', async (e) => {
      var message = document.getElementById('prey1-message-content').value;
      var delay = document.getElementById('prey1-message-flood-delay-range').value;
      var count = document.getElementById('prey1-message-flood-count-range').value;
      var command = {
        "target" : 1,
        "command" : "nping_icmp_flood",
        "parameters" : {
          "message" : message,
          "delay" : delay,
          "count" : count
        }
      };
      fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });

  document
    .getElementById('prey2-message-flood-delay-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey2-message-flood-delay').textContent = e.target.value;
    });
  document
    .getElementById('prey2-message-flood-count-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey2-message-flood-count').textContent = e.target.value;
    });
  document
    .getElementById('prey2-message-flood-button')
    .addEventListener('click', async (e) => {
      var message = document.getElementById('prey2-message-content').value;
      var delay = document.getElementById('prey2-message-flood-delay-range').value;
      var count = document.getElementById('prey2-message-flood-count-range').value;
      var command = {
        "target" : 2,
        "command" : "nping_icmp_flood",
        "parameters" : {
          "message" : message,
          "delay" : delay,
          "count" : count
        }
      };
      fetch('/', {
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
          "target" : i,
          "command" : "tone",
          "parameters" : {
            "frequency":frequency,
            "amplitude":1.0,
            "duration":duration,
            "shape":shape
          }
        };
        fetch('/', {
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
    .getElementById('prey0-frequency-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey0-frequency').textContent=e.target.value;
    });
  document
    .getElementById('prey0-duration-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey0-duration').textContent=e.target.value;
    });
  document
    .getElementById('prey0-tone-button')
    .addEventListener('click', async (e) => {
      var frequency = document.getElementById('prey0-frequency-range').value;
      var duration = document.getElementById('prey0-duration-range').value;
      var shape = document.getElementById('prey0-shape-select').value;
      var command = {
        "target" : 0,
        "command" : "tone",
        "parameters" : {
          "frequency":frequency,
          "amplitude":1.0,
          "duration":duration,
          "shape":shape
        }
      };
      fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });
  document
    .getElementById('prey0-tone-interval-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey0-tone-interval').textContent=e.target.value;
    });
  document
    .getElementById('prey0-tone-interval-toggle')
    .addEventListener('change', async (e) => {
      prey0ToneIntervalEnabled = document.getElementById('prey0-tone-interval-toggle').checked;
      if(prey0ToneIntervalEnabled){
        prey0ToneInterval();
      }
    });

  document
    .getElementById('prey1-frequency-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey1-frequency').textContent=e.target.value;
    });
  document
    .getElementById('prey1-duration-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey1-duration').textContent=e.target.value;
    });
  document
    .getElementById('prey1-tone-button')
    .addEventListener('click', async (e) => {
      var frequency = document.getElementById('prey1-frequency-range').value;
      var duration = document.getElementById('prey1-duration-range').value;
      var shape = document.getElementById('prey1-shape-select').value;
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
      fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });
  document
    .getElementById('prey1-tone-interval-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey1-tone-interval').textContent=e.target.value;
    });
  document
    .getElementById('prey1-tone-interval-toggle')
    .addEventListener('change', async (e) => {
      prey1ToneIntervalEnabled = document.getElementById('prey1-tone-interval-toggle').checked;
      if(prey1ToneIntervalEnabled){
        prey1ToneInterval();
      }
    });

  document
    .getElementById('prey2-frequency-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey2-frequency').textContent=e.target.value;
    });
  document
    .getElementById('prey2-duration-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey2-duration').textContent=e.target.value;
    });
  document
    .getElementById('prey2-tone-button')
    .addEventListener('click', async (e) => {
      var frequency = document.getElementById('prey2-frequency-range').value;
      var duration = document.getElementById('prey2-duration-range').value;
      var shape = document.getElementById('prey2-shape-select').value;
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
      fetch('/', {
        method: "POST",
        body: JSON.stringify(command)
      });
    });
  document
    .getElementById('prey2-tone-interval-range')
    .addEventListener('input', async (e) => {
      document.getElementById('prey2-tone-interval').textContent=e.target.value;
    });
  document
    .getElementById('prey2-tone-interval-toggle')
    .addEventListener('change',(e) => {
      prey2ToneIntervalEnabled = document.getElementById('prey2-tone-interval-toggle').checked;
      if(prey2ToneIntervalEnabled){
        prey2ToneInterval();
      }
    });

  // MASTER NMAP
  document
    .getElementById('master-nmap-button')
    .addEventListener('click', async (e) => {
      var parameters = [];
      
      parameters.push(document.getElementById('master-scan-mode-select').value);
      
      if (document.getElementById('master-scan-option-sc').checked){
        parameters.push("-sC");
      }
      if (document.getElementById('master-scan-option-sv').checked){
        parameters.push("-sV");
      }
      if (document.getElementById('master-scan-option-sy').checked){
        parameters.push("-sY");
      }
      if (document.getElementById('master-scan-option-sz').checked){
        parameters.push("-sZ");
      }
      if (document.getElementById('master-scan-option-o').checked){
        parameters.push("-O");
      }
      for (var i = 0; i < 3 ; i++){
        var command = {
          "target" : i,
          "command" : "scan",
          "parameters" : {
            "args": parameters
          }
        };
        fetch('/', {
          method: "POST",
          body: JSON.stringify(command)
        });
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

// PREY0 Intervals
function prey0ShiftInterval(){
  if(prey0ShiftIntervalEnabled){
    var interval = Math.round(document.getElementById('prey0-shift-interval-range').value);
    
    var range = document.getElementById('prey0-color-shift-range');
    range.value = Math.round(255*Math.random());
    range.dispatchEvent(new Event('input'));

    setTimeout(prey0ShiftInterval, interval);
  }
}

function prey0ChannelInterval(){
  if(prey0ChannelIntervalEnabled){
    var interval = Math.round(document.getElementById('prey0-channel-interval-range').value);
    
    var range = document.getElementById('prey0-channel-range');
    range.value = Math.round(13*Math.random());
    range.dispatchEvent(new Event('input'));

    setTimeout(prey0ChannelInterval, interval);
  }
}

function prey0ToneInterval(){
  if(prey0ToneIntervalEnabled){
    var interval = Math.round(document.getElementById('prey0-tone-interval-range').value);
    document
      .getElementById('prey0-tone-button')
      .click();
    setTimeout(prey0ToneInterval, interval);
  }
}

function prey0MessageInterval(){
  if(prey0MessageIntervalEnabled){
    var interval = Math.round(document.getElementById('prey0-message-interval-range').value);
    document
      .getElementById('prey0-message-button')
      .click();
    setTimeout(prey0MessageInterval, interval);
  }
}

// PREY1 Intervals
function prey1ShiftInterval(){
  if(prey1ShiftIntervalEnabled){
    var interval = Math.round(document.getElementById('prey1-shift-interval-range').value);
    
    var range = document.getElementById('prey1-color-shift-range');
    range.value = Math.round(255*Math.random());
    range.dispatchEvent(new Event('input'));

    setTimeout(prey1ShiftInterval, interval);
  }
}

function prey1ChannelInterval(){
  if(prey1ChannelIntervalEnabled){
    var interval = Math.round(document.getElementById('prey1-channel-interval-range').value);
    
    var range = document.getElementById('prey1-channel-range');
    range.value = Math.round(13*Math.random());
    range.dispatchEvent(new Event('input'));

    setTimeout(prey1ChannelInterval, interval);
  }
}

function prey1ToneInterval(){
  if(prey1ToneIntervalEnabled){
    var interval = Math.round(document.getElementById('prey1-tone-interval-range').value);
    document
      .getElementById('prey1-tone-button')
      .click();
    setTimeout(prey1ToneInterval, interval);
  }
}

function prey1MessageInterval(){
  if(prey1MessageIntervalEnabled){
    var interval = Math.round(document.getElementById('prey1-message-interval-range').value);
    document
      .getElementById('prey1-message-button')
      .click();
    setTimeout(prey1MessageInterval, interval);
  }
}

// PREY1 Intervals
function prey2ShiftInterval(){
  if(prey2ShiftIntervalEnabled){
    var interval = Math.round(document.getElementById('prey2-shift-interval-range').value);
    
    var range = document.getElementById('prey2-color-shift-range');
    range.value = Math.round(255*Math.random());
    range.dispatchEvent(new Event('input'));

    setTimeout(prey2ShiftInterval, interval);
  }
}

function prey2ChannelInterval(){
  if(prey2ChannelIntervalEnabled){
    var interval = Math.round(document.getElementById('prey2-channel-interval-range').value);
    
    var range = document.getElementById('prey2-channel-range');
    range.value = Math.round(13*Math.random());
    range.dispatchEvent(new Event('input'));

    setTimeout(prey2ChannelInterval, interval);
  }
}

function prey2ToneInterval(){
  if(prey2ToneIntervalEnabled){
    var interval = Math.round(document.getElementById('prey2-tone-interval-range').value);
    document
      .getElementById('prey2-tone-button')
      .click();
    setTimeout(prey2ToneInterval, interval);
  }
}

function prey2MessageInterval(){
  if(prey2MessageIntervalEnabled){
    var interval = Math.round(document.getElementById('prey2-message-interval-range').value);
    document
      .getElementById('prey2-message-button')
      .click();
    setTimeout(prey2MessageInterval, interval);
  }
}