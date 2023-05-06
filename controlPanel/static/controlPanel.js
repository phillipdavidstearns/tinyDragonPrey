var apLists={};
var targetList;

(function() {
  'use strict';
  window.addEventListener('load', async function() {
    await updateNetworkList();
    initControlPanel();
  }, false);
})();

var networkSSIDs = [
  'EvansSchool Public',
  '_Free Public WiFi_',
  '- DEN Airport Free WiFi',
  'DEN Airport Free WiFi',
  'DEN Airport Free WiFi 2.4',
]

function removeOptions(selectElement) {
   var i, L = selectElement.options.length - 1;
   for(i = L; i >= 0; i--) {
      selectElement.remove(i);
   }
}

function randomRange(min=0, max=0){
  if (max === min){
    return 0.0;
  } else if (min > max) {
    var smaller = max;
    max = min;
    min = smaller;
  }
  var diff = max - min;
  return diff*Math.random()+min;
}

async function fetchNetworks(){
  var response = await fetch('/?action=get_networks',{method:"POST"})
  if(response.ok){
    var networkList = null;
      try{
        networkList = await response.json();
      } catch(error){
        console.error(error);
      } finally{
        return networkList;
      }
  } else{
    return null;
  }
}

async function updateAPSelect(target_ip){
  try{
    const response = await fetch(
      '/?action=get_aps',
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({'target':`${target_ip}`})
      }
    );
    if(response.ok){
      const ap_list = await response.json();
      var select = document.getElementById(`${target_ip}-ssid-select`);
      removeOptions(select);
      var option;
      if (ap_list.online == true){
        apLists[target_ip]=ap_list;
        for(var k = 0 ; k < networkSSIDs.length; k++){
          option = document.createElement('option');
          option.setAttribute('value', networkSSIDs[k]);
          option.textContent = networkSSIDs[k];
          select.appendChild(option);
        }
        var keys = Object.keys(ap_list.aps);
        for(var j = 0 ; j < keys.length; j++){
          option = document.createElement('option');
            option.setAttribute('value',keys[j]);
            option.textContent = `${keys[j]} - ${ap_list.aps[keys[j]].count}`;
            select.appendChild(option);
        }
        select.selectedIndex = 0;
      } else {
        option = document.createElement('option');
        option.textContent = 'unreachable';
        select.appendChild(option);
        select.disabled = true;
        return null;
      }
    }
  } catch(error){
    console.error(error);
  }
}

async function updateStatus(target_ip){
  try{
    const response = await fetch(
      '/?action=get_state',
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({'target':`${target_ip}`})
      }
    );
    if(response.ok){
      var state = await response.json();
        console.log('state:',state);
        if (state){
          document.getElementById(`${target_ip}-print-toggle`).checked = state.print;
          document.getElementById(`${target_ip}-color-toggle`).checked = state.color;
          document.getElementById(`${target_ip}-character-toggle`).checked = state.control_characters;
          document.getElementById(`${target_ip}-color-shift-range`).value = state.color_shift;
          document.getElementById(`${target_ip}-color-shift`).textContent = state.color_shift;
          document.getElementById(`${target_ip}-monitor-toggle`).checked = state.wlan1_monitor_mode;
          document.getElementById(`${target_ip}-channel-range`).value = state.wlan1_channel;
          document.getElementById(`${target_ip}-channel`).textContent = state.wlan1_channel;
          document.getElementById(`${target_ip}-title`).textContent = target_ip;
        } else {
          document.getElementById(`${target_ip}-title`).textContent = "unreachable";
        }
      }
  } catch(error){
    console.error(error);
  }
}

async function updateNetworkList(){
  var networks = await fetchNetworks();
  if(networks){
    var select = document.getElementById('networks-select');
    for (var i = select.options.length - 1; i >=0; i--){
      select.options[i].remove();
    }
    for(var ifName in networks){
      var option = document.createElement('option');
      option.setAttribute('value',networks[ifName]);
      option.textContent=`${ifName}:${networks[ifName]}`;
      select.appendChild(option);
    }
  }
}

function createPanel(id){

  //---Bits and pieces---
  var row = document.createElement('div');
  row.setAttribute('class', 'row align-items-center justify-content-center text-center');

  var col = document.createElement('div');
  col.setAttribute('class', 'col text-center');

  var formToggleDiv = document.createElement('div');
  formToggleDiv.setAttribute('class','d-inline-block form-check form-switch');

  var formCheckDiv = document.createElement('div');
  formCheckDiv.setAttribute('class','form-check');

  var toggle = document.createElement('input');
  toggle.setAttribute('class', 'form-check-input');
  toggle.setAttribute('type', 'checkbox');

  var hr = document.createElement('hr');

  var formCheckLabel = document.createElement('label');
  formCheckLabel.setAttribute('class','form-check-label');

  var formLabel = document.createElement('label');
  formLabel.setAttribute('class','form-label');

  var range = document.createElement('input');
  range.setAttribute('type', 'range');

  var button = document.createElement('button');
  button.setAttribute('class', 'btn btn-sm btn-outline-secondary my-1');

  var select = document.createElement('select');
  select.setAttribute('class','form-select mb-1');

  //---Construction---
  var panel = document.createElement('div');
  panel.setAttribute('class','col-6 border border-1 rounded p-3');
  panel.setAttribute('id',`${id}`);

    var title = document.createElement('p');
    title.setAttribute('class','text-center h4');
    title.setAttribute('id',`${id}-title`);
    title.textContent =`${id}`;
    
    var textRow = row.cloneNode();
      var printCol = col.cloneNode();
        var printToggleDiv = formToggleDiv.cloneNode();
          var printToggle = toggle.cloneNode();
          printToggle.setAttribute('id',`${id}-print-toggle`);
          printToggle.addEventListener('change', async (e) => {
            var command = {
              "target" : id,
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
          var printToggleLabel = formCheckLabel.cloneNode();
          printToggleLabel.setAttribute('for',`${id}-print-toggle`);
          printToggleLabel.textContent =`print`;
        printToggleDiv.appendChild(printToggle);
        printToggleDiv.appendChild(printToggleLabel);
      printCol.appendChild(printToggleDiv);
      var charactersCol = col.cloneNode();
        var charactersToggleDiv = formToggleDiv.cloneNode();
          var charactersToggle = toggle.cloneNode();
          charactersToggle.setAttribute('id',`${id}-character-toggle`);
          charactersToggle.addEventListener('change', async (e) => {
            var command = {
              "target" : id,
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
          var charactersToggleLabel = formCheckLabel.cloneNode();
          charactersToggleLabel.setAttribute('for',`${id}-character-toggle`);
          charactersToggleLabel.textContent =`special chars`;
        charactersToggleDiv.appendChild(charactersToggle);
        charactersToggleDiv.appendChild(charactersToggleLabel);
      charactersCol.appendChild(charactersToggleDiv);
      var colorCol = col.cloneNode();
        var colorToggleDiv = formToggleDiv.cloneNode();
          var colorToggle = toggle.cloneNode();
          colorToggle.setAttribute('id',`${id}-color-toggle`);
          colorToggle.addEventListener('change', async (e) => {
            var command = {
              "target": id,
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
          var colorToggleLabel = formCheckLabel.cloneNode();
          colorToggleLabel.setAttribute('for',`${id}-color-toggle`);
          colorToggleLabel.textContent =`color`;
        colorToggleDiv.appendChild(colorToggle);
        colorToggleDiv.appendChild(colorToggleLabel);
      colorCol.appendChild(colorToggleDiv);
    textRow.appendChild(printCol);
    textRow.appendChild(charactersCol);
    textRow.appendChild(colorCol);

    var colorShiftRow = row.cloneNode();
      var colorShiftCol = col.cloneNode();
        var colorShiftRangeLabel = formLabel.cloneNode();
        colorShiftRangeLabel.setAttribute('for',`${id}-color-shift-range`);
        colorShiftRangeLabel.textContent='color shift'
        var colorShiftRange = range.cloneNode();
        colorShiftRange.setAttribute('class','form-range w-75');
        colorShiftRange.setAttribute('min','0');
        colorShiftRange.setAttribute('max','255');
        colorShiftRange.setAttribute('step','1');
        colorShiftRange.setAttribute('value','0');
        colorShiftRange.setAttribute('id',`${id}-color-shift-range`);
        colorShiftRange.addEventListener('input', async (e) => {
          document.getElementById(`${id}-color-shift`).textContent = e.target.value;
          var command = {
            "target" : id,
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
        var colorShiftIndicator = document.createElement('span');
        colorShiftIndicator.setAttribute('id',`${id}-color-shift`);
        colorShiftIndicator.textContent = '0';
      colorShiftCol.appendChild(colorShiftRangeLabel);
      colorShiftCol.appendChild(colorShiftRange);
      colorShiftCol.appendChild(colorShiftIndicator);
    colorShiftRow.appendChild(colorShiftCol);

    var colorShiftIntervalRow = row.cloneNode();
      var colorShiftIntervalCol = col.cloneNode();
        var colorShiftIntervalRangeLabel = formLabel.cloneNode();
        colorShiftIntervalRangeLabel.setAttribute('for',`${id}-shift-interval-range`);
        colorShiftIntervalRangeLabel.textContent='interval';
        var colorShiftIntervalRange = range.cloneNode();
        colorShiftIntervalRange.setAttribute('class','form-range w-50');
        colorShiftIntervalRange.setAttribute('min','25');
        colorShiftIntervalRange.setAttribute('max','2500');
        colorShiftIntervalRange.setAttribute('step','1');
        colorShiftIntervalRange.setAttribute('value','1000');
        colorShiftIntervalRange.setAttribute('id',`${id}-shift-interval-range`);
        colorShiftIntervalRange.addEventListener('input', async (e) => {
          document.getElementById(`${id}-shift-interval`).textContent = e.target.value;
        });
        var colorShiftIntervalIndicator = document.createElement('span');
        colorShiftIntervalIndicator.setAttribute('id',`${id}-shift-interval`);
        colorShiftIntervalIndicator.textContent = '1000';
      colorShiftIntervalCol.appendChild(colorShiftIntervalRangeLabel);
      colorShiftIntervalCol.appendChild(colorShiftIntervalRange);
      colorShiftIntervalCol.appendChild(colorShiftIntervalIndicator);
      var colorShiftIntervalToggleCol = col.cloneNode();
        var colorShiftIntervalToggleDiv = formToggleDiv.cloneNode();
          var colorShiftIntervalToggle = toggle.cloneNode();
          colorShiftIntervalToggle.setAttribute('id',`${id}-shift-interval-toggle`);
          colorShiftIntervalToggle.addEventListener('change', async (e) => {
            if(e.target.checked){
              shiftInterval(id);
            }
          });
          var colorShiftIntervalToggleLabel = formCheckLabel.cloneNode();
          colorShiftIntervalToggleLabel.setAttribute('for',`${id}-shift-interval-toggle`);
          colorShiftIntervalToggleLabel.textContent = `retrigger`;
        colorShiftIntervalToggleDiv.appendChild(colorShiftIntervalToggle);
        colorShiftIntervalToggleDiv.appendChild(colorShiftIntervalToggleLabel);
      colorShiftIntervalToggleCol.appendChild(colorShiftIntervalToggleDiv);
    colorShiftIntervalRow.appendChild(colorShiftIntervalCol);
    colorShiftIntervalRow.appendChild(colorShiftIntervalToggleCol);

    var wifiRow = row.cloneNode();
      var wifiMonitorCol = col.cloneNode();
        var wifiMonitorToggleDiv = formToggleDiv.cloneNode();
          var wifiMonitorToggle = toggle.cloneNode();
          wifiMonitorToggle.setAttribute('id',`${id}-monitor-toggle`);
          wifiMonitorToggle.addEventListener('change', async (e) => {
            var command = {
              "target" : id,
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
          var wifiMonitorToggleLabel = formCheckLabel.cloneNode();
          wifiMonitorToggleLabel.setAttribute('for',`${id}-monitor-toggle`);
          wifiMonitorToggleLabel.textContent=`monitor mode`;
        wifiMonitorToggleDiv.appendChild(wifiMonitorToggle);
        wifiMonitorToggleDiv.appendChild(wifiMonitorToggleLabel);
      wifiMonitorCol.appendChild(wifiMonitorToggleDiv);

      var wifiChannelCol = col.cloneNode();
        var wifiChannelRangeLabel = formLabel.cloneNode();
        wifiChannelRangeLabel.setAttribute('for',`${id}-channel-range`);
        wifiChannelRangeLabel.textContent='channel';
        var wifiChannelRange = range.cloneNode();
        wifiChannelRange.setAttribute('class','form-range w-75');
        wifiChannelRange.setAttribute('min','1');
        wifiChannelRange.setAttribute('max','13');
        wifiChannelRange.setAttribute('step','1');
        wifiChannelRange.setAttribute('value','1');
        wifiChannelRange.setAttribute('id',`${id}-channel-range`);
        wifiChannelRange.addEventListener('input', async (e) => {
          document.getElementById(`${id}-channel`).textContent = e.target.value;
          var command = {
            "target" : id,
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
        var wifiChannelIndicator = document.createElement('span');
        wifiChannelIndicator.setAttribute('id',`${id}-channel`);
        wifiChannelIndicator.textContent='-';
      wifiChannelCol.appendChild(wifiChannelRangeLabel);
      wifiChannelCol.appendChild(wifiChannelRange);
      wifiChannelCol.appendChild(wifiChannelIndicator);
    wifiRow.appendChild(wifiMonitorCol);
    wifiRow.appendChild(wifiChannelCol);

    var wifiIntervalRow = row.cloneNode();
      var wifiIntervalCol = col.cloneNode();
        var wifiIntervalRangeLabel = formLabel.cloneNode();
        wifiIntervalRangeLabel.setAttribute('for',`${id}-channel-interval-range`);
        wifiIntervalRangeLabel.textContent='interval';
        var wifiIntervalRange = range.cloneNode();
        wifiIntervalRange.setAttribute('class','form-range w-50');
        wifiIntervalRange.setAttribute('min','25');
        wifiIntervalRange.setAttribute('max','2500');
        wifiIntervalRange.setAttribute('step','1');
        wifiIntervalRange.setAttribute('value','1000');
        wifiIntervalRange.setAttribute('id',`${id}-channel-interval-range`);
        wifiIntervalRange.addEventListener('input', async (e) => {
          document.getElementById(`${id}-channel-interval`).textContent = e.target.value;
        });
        var wifiIntervalIndicator = document.createElement('span');
        wifiIntervalIndicator.setAttribute('id',`${id}-channel-interval`);
        wifiIntervalIndicator.textContent='1000';
      wifiIntervalCol.appendChild(wifiIntervalRangeLabel);
      wifiIntervalCol.appendChild(wifiIntervalRange);
      wifiIntervalCol.appendChild(wifiIntervalIndicator);
      var wifiIntervalToggleCol = col.cloneNode();
        var wifiIntervalToggleDiv = formToggleDiv.cloneNode();
          var wifiIntervalToggle = toggle.cloneNode();
          wifiIntervalToggle.setAttribute('id',`${id}-channel-interval-toggle`);
          wifiIntervalToggle.addEventListener('change', async (e) => {
            if(e.target.checked){
              channelInterval(id);
            }
          });
          var wifiIntervalToggleLabel = formCheckLabel.cloneNode();
          wifiIntervalToggleLabel.setAttribute('for',`${id}-channel-interval-toggle`);
          wifiIntervalToggleLabel.textContent=`retrigger`;
        wifiIntervalToggleDiv.appendChild(wifiIntervalToggle);
        wifiIntervalToggleDiv.appendChild(wifiIntervalToggleLabel);
      wifiIntervalToggleCol.appendChild(wifiIntervalToggleDiv);
    wifiIntervalRow.appendChild(wifiIntervalCol);
    wifiIntervalRow.appendChild(wifiIntervalToggleCol);

    var messageRow = row.cloneNode();
      var messageCol = col.cloneNode();
        var messageInput = document.createElement('textarea');
        messageInput.setAttribute('class','form-control');
        messageInput.setAttribute('id',`${id}-message-content`);
        messageInput.setAttribute('name','message');
        messageInput.setAttribute('rows','3');
        messageInput.setAttribute('placeholder','Send a message.');
      messageCol.appendChild(messageInput);
    messageRow.appendChild(messageCol);

    var sendRow = row.cloneNode();
      var sendCol = col.cloneNode();
        var sendButton = button.cloneNode();
        sendButton.setAttribute('id',`${id}-message-button`);
        sendButton.textContent='send';
        sendButton.addEventListener('click', async (e) => {
          var message = document.getElementById(`${id}-message-content`).value
          var command = {
            "target" : id,
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
      sendCol.appendChild(sendButton);
    sendRow.appendChild(sendCol);

    var messageIntervalRow = row.cloneNode();
      var messageIntervalCol = col.cloneNode();
        var messageIntervalRangeLabel = formLabel.cloneNode();
        messageIntervalRangeLabel.setAttribute('for',`${id}-message-interval-range`);
        messageIntervalRangeLabel.textContent='interval';
        var messageIntervalRange = range.cloneNode();
        messageIntervalRange.setAttribute('class','form-range w-75');
        messageIntervalRange.setAttribute('min','25');
        messageIntervalRange.setAttribute('max','2500');
        messageIntervalRange.setAttribute('step','1');
        messageIntervalRange.setAttribute('value','1000');
        messageIntervalRange.setAttribute('id',`${id}-message-interval-range`);
        messageIntervalRange.addEventListener('input', async (e) => {
          document.getElementById(`${id}-message-interval`).textContent = e.target.value;
        });
        var messageIntervalIndicator = document.createElement('span');
        messageIntervalIndicator.setAttribute('id',`${id}-message-interval`);
        messageIntervalIndicator.textContent='1000';
      messageIntervalCol.appendChild(messageIntervalRangeLabel);
      messageIntervalCol.appendChild(messageIntervalRange);
      messageIntervalCol.appendChild(messageIntervalIndicator);
      var messageIntervalToggleCol = col.cloneNode();
        var messageIntervalToggleDiv = formToggleDiv.cloneNode();
          var messageIntervalToggle = toggle.cloneNode();
          messageIntervalToggle.setAttribute('id',`${id}-message-interval-toggle`);
          messageIntervalToggle.addEventListener('change', async (e) => {
            if(e.target.checked){
              messageInterval(id);
            }
          });
          var messageIntervalToggleLabel = formCheckLabel.cloneNode();
          messageIntervalToggleLabel.setAttribute('for',`${id}-message-interval-toggle`);
          messageIntervalToggleLabel.textContent=`retrigger`;
        messageIntervalToggleDiv.appendChild(messageIntervalToggle);
        messageIntervalToggleDiv.appendChild(messageIntervalToggleLabel);
      messageIntervalToggleCol.appendChild(messageIntervalToggleDiv);
    messageIntervalRow.appendChild(messageIntervalCol);
    messageIntervalRow.appendChild(messageIntervalToggleCol);

    var floodRow = row.cloneNode();
      var floodDelayCol = col.cloneNode();
        var floodDelayRangeLabel = formLabel.cloneNode();
        floodDelayRangeLabel.setAttribute('for',`${id}-message-flood-delay-range`);
        floodDelayRangeLabel.textContent='delay';
        var floodDelayRange = range.cloneNode();
        floodDelayRange.setAttribute('class','form-range w-75');
        floodDelayRange.setAttribute('min','0.0');
        floodDelayRange.setAttribute('max','1.0');
        floodDelayRange.setAttribute('step','0.001');
        floodDelayRange.setAttribute('value','0.500');
        floodDelayRange.setAttribute('id',`${id}-message-flood-delay-range`);
        floodDelayRange.addEventListener('input', async (e) => {
          document.getElementById(`${id}-message-flood-delay`).textContent = parseFloat(e.target.value).toFixed(3);
        });
        var floodDelayIndicator = document.createElement('span');
        floodDelayIndicator.setAttribute('id',`${id}-message-flood-delay`);
        floodDelayIndicator.textContent='0.500';
      floodDelayCol.appendChild(floodDelayRangeLabel);
      floodDelayCol.appendChild(floodDelayRange);
      floodDelayCol.appendChild(floodDelayIndicator);

      var floodCountCol = col.cloneNode();
        var floodCountRangeLabel = formLabel.cloneNode();
        floodCountRangeLabel.setAttribute('for',`${id}-message-flood-count-range`);
        floodCountRangeLabel.textContent='count';
        var floodCountRange = range.cloneNode();
        floodCountRange.setAttribute('class','form-range w-75');
        floodCountRange.setAttribute('min','1');
        floodCountRange.setAttribute('max','100');
        floodCountRange.setAttribute('step','1');
        floodCountRange.setAttribute('value','5');
        floodCountRange.setAttribute('id',`${id}-message-flood-count-range`);
        floodCountRange.addEventListener('input', async (e) => {
          document.getElementById(`${id}-message-flood-count`).textContent = e.target.value;
        });
        var floodCountIndicator = document.createElement('span');
        floodCountIndicator.setAttribute('id',`${id}-message-flood-count`);
        floodCountIndicator.textContent='5';
      floodCountCol.appendChild(floodCountRangeLabel);
      floodCountCol.appendChild(floodCountRange);
      floodCountCol.appendChild(floodCountIndicator);
    floodRow.appendChild(floodDelayCol);
    floodRow.appendChild(floodCountCol);

    var floodSendRow = row.cloneNode();
      var floodSendCol = col.cloneNode();
        floodSendButton = button.cloneNode();
        floodSendButton.setAttribute('id',`${id}-message-flood-button`);
        floodSendButton.textContent='flood';
        floodSendButton.addEventListener('click', async (e) => {
          var message = document.getElementById(`${id}-message-content`).value;
          var delay = document.getElementById(`${id}-message-flood-delay-range`).value;
          var count = document.getElementById(`${id}-message-flood-count-range`).value;
          var command = {
            "target" : id,
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
      floodSendCol.appendChild(floodSendButton);
    floodSendRow.appendChild(floodSendCol);

    var toneShapeRow = row.cloneNode();
      var randomShapeCol = document.createElement('div');
      randomShapeCol.setAttribute('class','col-1');
        var randomShapeToggleDiv = formCheckDiv.cloneNode();
          var randomShapeToggle = toggle.cloneNode();
          randomShapeToggle.setAttribute('id',`${id}-shape-random-toggle`);
          var randomShapeToggleLabel = formCheckLabel.cloneNode();
          randomShapeToggleLabel.setAttribute('for',`${id}-shape-random-toggle`);
          randomShapeToggleLabel.textContent=`rand`;
        randomShapeToggleDiv.appendChild(randomShapeToggle);
        randomShapeToggleDiv.appendChild(randomShapeToggleLabel);
      randomShapeCol.appendChild(randomShapeToggleDiv);
      var shapeSelectCol = document.createElement('div');
      shapeSelectCol.setAttribute('class','col-11');
        var shapeSelect = select.cloneNode();
        shapeSelect.setAttribute('id',`${id}-shape-select`);
          var options = ['sine', 'tri', 'square', 'random', 'noise'];
          var option;
          for(var i = 0; i < options.length; i++){
            option = document.createElement('option');
            option.value = options[i];
            option.textContent = options[i];
            if (options[i] == 'random'){
              option.selected=true;
            }
            shapeSelect.appendChild(option);
          }
      shapeSelectCol.appendChild(shapeSelect);
    toneShapeRow.appendChild(randomShapeCol);
    toneShapeRow.appendChild(shapeSelectCol);

    var toneParamsRow = row.cloneNode();
      var freqRandCol = document.createElement('div');
      freqRandCol.setAttribute('class','col-1');
        var freqRandToggleDiv = formCheckDiv.cloneNode();
          var freqRandToggle = toggle.cloneNode();
          freqRandToggle.setAttribute('id',`${id}-frequency-random-toggle`);
          var freqRandToggleLabel = formCheckLabel.cloneNode();
          freqRandToggleLabel.setAttribute('for',`${id}-frequency-random-toggle`);
          freqRandToggleLabel.textContent=`rand`;
        freqRandToggleDiv.appendChild(freqRandToggle);
        freqRandToggleDiv.appendChild(freqRandToggleLabel);
      freqRandCol.appendChild(freqRandToggleDiv);

      var freqRangeCol = document.createElement('div');
      freqRangeCol.setAttribute('class','col-8');
        var freqRange = range.cloneNode();
        freqRange.setAttribute('class','form-range w-75');
        freqRange.setAttribute('min','10');
        freqRange.setAttribute('max','10000');
        freqRange.setAttribute('step','0.1');
        freqRange.setAttribute('value','1000');
        freqRange.setAttribute('id',`${id}-frequency-range`);
        freqRange.addEventListener('input', async (e) => {
          document.getElementById(`${id}-frequency`).value = e.target.value;
        });
        var freqRangeLabel = formLabel.cloneNode();
        freqRangeLabel.setAttribute('for',`${id}-freq-range`);
        freqRangeLabel.textContent='freq';
      freqRangeCol.appendChild(freqRange);
      freqRangeCol.appendChild(freqRangeLabel);

      var freqNumberCol = document.createElement('div');
      freqNumberCol.setAttribute('class','col-3');
        var freqNumber = document.createElement('input');
        freqNumber.setAttribute('class','form-control');
        freqNumber.setAttribute('type','number');
        freqNumber.setAttribute('min','10');
        freqNumber.setAttribute('max','10000');
        freqNumber.setAttribute('value','1000');
        freqNumber.setAttribute('id',`${id}-frequency`);
        freqNumber.addEventListener('change', async (e) => {
          document.getElementById(`${id}-frequency-range`).value = e.target.value;
        });
      freqNumberCol.appendChild(freqNumber);
    toneParamsRow.appendChild(freqRandCol);
    toneParamsRow.appendChild(freqRangeCol);
    toneParamsRow.appendChild(freqNumberCol);

    var durationRow = row.cloneNode();
      var durationRandCol = document.createElement('div');
      durationRandCol.setAttribute('class','col-1');
        var durationRandToggleDiv = formCheckDiv.cloneNode();
          var durationRandToggle = toggle.cloneNode();
          durationRandToggle.setAttribute('id',`${id}-duration-random-toggle`);
          var durationRandToggleLabel = formCheckLabel.cloneNode();
          durationRandToggleLabel.setAttribute('for',`${id}-duration-random-toggle`);
          durationRandToggleLabel.textContent=`rand`;
        durationRandToggleDiv.appendChild(durationRandToggle);
        durationRandToggleDiv.appendChild(durationRandToggleLabel);
      durationRandCol.appendChild(durationRandToggleDiv);

      var durationRangeCol = document.createElement('div');
      durationRangeCol.setAttribute('class','col-8');
        var durationRange = range.cloneNode();
        durationRange.setAttribute('class','form-range w-75');
        durationRange.setAttribute('min','2');
        durationRange.setAttribute('max','8164');
        durationRange.setAttribute('step','1');
        durationRange.setAttribute('value','500');
        durationRange.setAttribute('id',`${id}-duration-range`);
        durationRange.addEventListener('input', async (e) => {
          document.getElementById(`${id}-duration`).value=e.target.value;
        });
        var durationRangeLabel = formLabel.cloneNode();
        durationRangeLabel.setAttribute('for',`${id}-duration-range`);
        durationRangeLabel.textContent='duration';
      durationRangeCol.appendChild(durationRange);
      durationRangeCol.appendChild(durationRangeLabel);

      var durationNumberCol = document.createElement('div');
      durationNumberCol.setAttribute('class','col-3');
        var durationNumber = document.createElement('input');
        durationNumber.setAttribute('class','form-control');
        durationNumber.setAttribute('type','number');
        durationNumber.setAttribute('min','2');
        durationNumber.setAttribute('max','8164');
        durationNumber.setAttribute('value','500');
        durationNumber.setAttribute('id',`${id}-duration`);
        durationNumber.addEventListener('change', async (e) => {
          document.getElementById(`${id}-duration-range`).value = e.target.value;
        });
      durationNumberCol.appendChild(durationNumber);
    durationRow.appendChild(durationRandCol);
    durationRow.appendChild(durationRangeCol);
    durationRow.appendChild(durationNumberCol);

    var toneIntervalRow = row.cloneNode();
      var randomToneIntervalCol = document.createElement('div');
      randomToneIntervalCol.setAttribute('class','col-1');
        var randomToneIntervalToggleDiv = formCheckDiv.cloneNode();
          var randomToneIntervalToggle = toggle.cloneNode();
          randomToneIntervalToggle.setAttribute('id',`${id}-interval-random-toggle`);
          var randomToneIntervalToggleLabel = formCheckLabel.cloneNode();
          randomToneIntervalToggleLabel.setAttribute('for',`${id}-interval-random-toggle`);
          randomToneIntervalToggleLabel.textContent=`rand`;
        randomToneIntervalToggleDiv.appendChild(randomToneIntervalToggle);
        randomToneIntervalToggleDiv.appendChild(randomToneIntervalToggleLabel);
      randomToneIntervalCol.appendChild(randomToneIntervalToggleDiv);
      var toneIntervalRangeCol = document.createElement('div');
      toneIntervalRangeCol.setAttribute('class','col-7');
        var toneIntervalRangeLabel = formLabel.cloneNode();
        toneIntervalRangeLabel.setAttribute('for',`${id}-tone-interval-range`);
        toneIntervalRangeLabel.textContent='interval';
        var toneIntervalRange = range.cloneNode();
        toneIntervalRange.setAttribute('class','form-range w-75');
        toneIntervalRange.setAttribute('min','50');
        toneIntervalRange.setAttribute('max','2500');
        toneIntervalRange.setAttribute('step','1');
        toneIntervalRange.setAttribute('value','1000');
        toneIntervalRange.setAttribute('id',`${id}-tone-interval-range`);
        toneIntervalRange.addEventListener('input', async (e) => {
          document.getElementById(`${id}-tone-interval`).value = e.target.value;
        });
      toneIntervalRangeCol.appendChild(toneIntervalRangeLabel);
      toneIntervalRangeCol.appendChild(toneIntervalRange);
      var toneIntervalNumberCol = document.createElement('div');
      toneIntervalNumberCol.setAttribute('class','col-2');
        var toneIntervalNumber = document.createElement('input');
        toneIntervalNumber.setAttribute('class','form-control');
        toneIntervalNumber.setAttribute('type','number');
        toneIntervalNumber.setAttribute('min','50');
        toneIntervalNumber.setAttribute('max','2500');
        toneIntervalNumber.setAttribute('value','1000');
        toneIntervalNumber.setAttribute('id',`${id}-tone-interval`);
        toneIntervalNumber.addEventListener('change', async (e) => {
          document.getElementById(`${id}-tone-interval-range`).value = e.target.value;
        });
      toneIntervalNumberCol.appendChild(toneIntervalNumber);
      var toneIntervalToggleCol = col.cloneNode();
        var toneIntervalToggleDiv = formToggleDiv.cloneNode();
          var toneIntervalToggle = toggle.cloneNode();
          toneIntervalToggle.setAttribute('id',`${id}-tone-interval-toggle`);
          toneIntervalToggle.addEventListener('change', async (e) => {
            if(e.target.checked){
              toneInterval(id);
            }
          });
          var toneIntervalToggleLabel = formCheckLabel.cloneNode();
          toneIntervalToggleLabel.setAttribute('for',`${id}-tone-interval-toggle`);
          toneIntervalToggleLabel.textContent=`retrigger`;
          
        toneIntervalToggleDiv.appendChild(toneIntervalToggle);
        toneIntervalToggleDiv.appendChild(toneIntervalToggleLabel);
      toneIntervalToggleCol.appendChild(toneIntervalToggleDiv);
    toneIntervalRow.appendChild(randomToneIntervalCol);
    toneIntervalRow.appendChild(toneIntervalRangeCol);
    toneIntervalRow.appendChild(toneIntervalNumberCol);
    toneIntervalRow.appendChild(toneIntervalToggleCol);

    var beepRow = row.cloneNode();
      var beepCol = col.cloneNode();
        var beepButton = button.cloneNode();
        beepButton.setAttribute('id',`${id}-tone-button`);
        beepButton.textContent='beep';
        beepButton.addEventListener('click', async (e) => {
          var frequency = document.getElementById(`${id}-frequency-range`).value;
          var duration = document.getElementById(`${id}-duration-range`).value;
          var shape = document.getElementById(`${id}-shape-select`).value;
          var command = {
            "target" : id,
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
      beepCol.appendChild(beepButton);
    beepRow.appendChild(beepCol);

    var scanRow = row.cloneNode();
      var scanModeCol = document.createElement('div');
      scanModeCol.setAttribute('class','col-2');
        var scanModeSelect = select.cloneNode();
        scanModeSelect.setAttribute('id',`${id}-scan-mode-select`);
          var options = ['-sS','-sT','-sA','-sX'];
          var option;
          for(var i = 0; i < options.length; i++){
            option = document.createElement('option');
            option.value = options[i];
            option.textContent = options[i];
            if(options[i]=='-sT'){
              option.selected=true;
            }
            scanModeSelect.appendChild(option);
          }
      scanModeCol.appendChild(scanModeSelect);
      var scanOptionSyCol = document.createElement('div');
      scanOptionSyCol.setAttribute('class','col-1');
        var scanOptionSyToggle = toggle.cloneNode();
        scanOptionSyToggle.setAttribute('id',`${id}-scan-option-sy`);
        var scanOptionSyLabel = formCheckLabel.cloneNode();
        scanOptionSyLabel.setAttribute('for',`${id}-scan-option-sy`);
        scanOptionSyLabel.textContent = 'sY';
      scanOptionSyCol.appendChild(scanOptionSyToggle);
      scanOptionSyCol.appendChild(scanOptionSyLabel);
      var scanOptionSzCol = document.createElement('div');
      scanOptionSzCol.setAttribute('class','col-1');
        var scanOptionSzToggle = toggle.cloneNode();
        scanOptionSzToggle.setAttribute('id',`${id}-scan-option-sz`);
        var scanOptionSzLabel = formCheckLabel.cloneNode();
        scanOptionSzLabel.setAttribute('for',`${id}-scan-option-sz`);
        scanOptionSzLabel.textContent = 'sZ';
      scanOptionSzCol.appendChild(scanOptionSzToggle);
      scanOptionSzCol.appendChild(scanOptionSzLabel);
      var scanOptionScCol = document.createElement('div');
      scanOptionScCol.setAttribute('class','col-1');
        var scanOptionScToggle = toggle.cloneNode();
        scanOptionScToggle.setAttribute('id',`${id}-scan-option-sc`);
        var scanOptionScLabel = formCheckLabel.cloneNode();
        scanOptionScLabel.setAttribute('for',`${id}-scan-option-sc`);
        scanOptionScLabel.textContent = 'sC';
      scanOptionScCol.appendChild(scanOptionScToggle);
      scanOptionScCol.appendChild(scanOptionScLabel);
      var scanOptionSvCol = document.createElement('div');
      scanOptionSvCol.setAttribute('class','col-1');
        var scanOptionSvToggle = toggle.cloneNode();
        scanOptionSvToggle.setAttribute('id',`${id}-scan-option-sv`);
        var scanOptionSvLabel = formCheckLabel.cloneNode();
        scanOptionSvLabel.setAttribute('for',`${id}-scan-option-sv`);
        scanOptionSvLabel.textContent = 'sV';
      scanOptionSvCol.appendChild(scanOptionSvToggle);
      scanOptionSvCol.appendChild(scanOptionSvLabel);
      var scanOptionOCol = document.createElement('div');
      scanOptionOCol.setAttribute('class','col-1');
        var scanOptionOToggle = toggle.cloneNode();
        scanOptionOToggle.setAttribute('id',`${id}-scan-option-o`);
        var scanOptionOLabel = formCheckLabel.cloneNode();
        scanOptionOLabel.setAttribute('for',`${id}-scan-option-o`);
        scanOptionOLabel.textContent = 'O';
      scanOptionOCol.appendChild(scanOptionOToggle);
      scanOptionOCol.appendChild(scanOptionOLabel);
      var scanButtonCol = document.createElement('div');
      scanButtonCol.setAttribute('class','col-1');
        var scanButton = button.cloneNode();
        scanButton.setAttribute('id',`${id}-scan-button`);
        scanButton.textContent='scan';
        scanButton.addEventListener('click', async (e) => {
          var parameters = [];
          parameters.push(document.getElementById(`${id}-scan-mode-select`).value);
          if (document.getElementById(`${id}-scan-option-sc`).checked){
            parameters.push("-sC");
          }
          if (document.getElementById(`${id}-scan-option-sv`).checked){
            parameters.push("-sV");
          }
          if (document.getElementById(`${id}-scan-option-sy`).checked){
            parameters.push("-sY");
          }
          if (document.getElementById(`${id}-scan-option-sz`).checked){
            parameters.push("-sZ");
          }
          if (document.getElementById(`${id}-scan-option-o`).checked){
            parameters.push("-O");
          }
          var command = {
            "target" : id,
            "command" : "scan",
            "parameters" : {
              "args": parameters
            }
          };
          fetch('/', {
            method: "POST",
            body: JSON.stringify(command)
          });
        });
      scanButtonCol.appendChild(scanButton);
    scanRow.appendChild(scanModeCol);
    scanRow.appendChild(scanOptionSyCol);
    scanRow.appendChild(scanOptionSzCol);
    scanRow.appendChild(scanOptionScCol);
    scanRow.appendChild(scanOptionSvCol);
    scanRow.appendChild(scanOptionOCol);
    scanRow.appendChild(scanButtonCol);

    var rogueAPRow = row.cloneNode();
      var rogueAPSSIDCol = document.createElement('div');
      rogueAPSSIDCol.setAttribute('class','col-1');
        var rogueAPSSIDButton = button.cloneNode();
        rogueAPSSIDButton.setAttribute('id',`${id}-ssid-button`);
        rogueAPSSIDButton.textContent='+';
        rogueAPSSIDButton.addEventListener('click', async (e) =>{
          await updateAPSelect(id);
        });
      rogueAPSSIDCol.appendChild(rogueAPSSIDButton);
      var rogueAPSelectCol = document.createElement('div');
      rogueAPSelectCol.setAttribute('class','col-10');
        var rogueAPSelect = select.cloneNode();
        rogueAPSelect.setAttribute('id',`${id}-ssid-select`);
      rogueAPSelectCol.appendChild(rogueAPSelect);
      var rogueAPSSIDToggleCol = document.createElement('div');
      rogueAPSSIDToggleCol.setAttribute('class','col-1');
        var rogueAPSSIDToggleDiv = formToggleDiv.cloneNode();
          var rogueAPSSIDToggle = toggle.cloneNode();
          rogueAPSSIDToggle.setAttribute('id',`${id}-ap-toggle`);
          rogueAPSSIDToggle.addEventListener('change', async (e) => {
            var ssid = document.getElementById(`${id}-ssid-select`).value;
            document.getElementById(`${id}-monitor-toggle`).disabled = e.target.checked;
            document.getElementById(`${id}-channel-range`).disabled = e.target.checked;
            var toggle = document.getElementById(`${id}-channel-interval-toggle`);
            toggle.checked = false;
            toggle.disabled = e.target.checked;
            toggle.dispatchEvent(new Event('change'));
            var command; 
            var MAC = null;
            console.log(apLists);
            if(apLists[id].aps[ssid]){
              if(apLists[id].aps[ssid]['MACs']){
                MAC = apLists[id].aps[ssid].MACs[0];
              }
            }
            if(e.target.checked){
              command = {
                'target' : id,
                'command' : 'start_ap',
                'parameters' : {
                  'SSID' : ssid,
                  'channel' : 5,
                  'MAC' : MAC
                }
              }
            } else {
              command = {
                'target' : id,
                'command' : 'stop_ap',
                'parameters' : {}
              }
            }
            fetch('/', {
              method: "POST",
              body: JSON.stringify(command)
            });
          });
        rogueAPSSIDToggleDiv.appendChild(rogueAPSSIDToggle);
      rogueAPSSIDToggleCol.appendChild(rogueAPSSIDToggleDiv);
    rogueAPRow.appendChild(rogueAPSSIDCol);
    rogueAPRow.appendChild(rogueAPSelectCol);
    rogueAPRow.appendChild(rogueAPSSIDToggleCol);

  panel.appendChild(title);
  panel.appendChild(hr.cloneNode());
  panel.appendChild(textRow);
  panel.appendChild(colorShiftRow);
  panel.appendChild(colorShiftIntervalRow);
  panel.appendChild(hr.cloneNode());
  panel.appendChild(wifiRow);
  panel.appendChild(wifiIntervalRow);
  panel.appendChild(hr.cloneNode());
  panel.appendChild(messageRow);
  panel.appendChild(sendRow);
  panel.appendChild(messageIntervalRow);
  panel.appendChild(floodRow);
  panel.appendChild(floodSendRow);
  panel.appendChild(hr.cloneNode());
  panel.appendChild(toneShapeRow);
  panel.appendChild(toneParamsRow);
  panel.appendChild(durationRow);
  panel.appendChild(toneIntervalRow);
  panel.appendChild(beepRow);
  panel.appendChild(hr.cloneNode());
  panel.appendChild(scanRow);
  panel.appendChild(rogueAPRow);

  return panel
}

function shiftInterval(id){
  if(document.getElementById(`${id}-shift-interval-toggle`).checked){
    var interval = Math.round(document.getElementById(`${id}-shift-interval-range`).value);
    var range = document.getElementById(`${id}-color-shift-range`);
    range.value = Math.round(255*Math.random());
    range.dispatchEvent(new Event('input'));
    setTimeout(shiftInterval, interval, id);
  }
}

function channelInterval(id){
  if(document.getElementById(`${id}-channel-interval-toggle`).checked){
    var interval = Math.round(document.getElementById(`${id}-channel-interval-range`).value);
    var range = document.getElementById(`${id}-channel-range`);
    range.value = Math.round(13*Math.random());
    range.dispatchEvent(new Event('input'));
    setTimeout(channelInterval, interval, id);
  }
}

function messageInterval(id){
  if(document.getElementById(`${id}-message-interval-toggle`).checked){
    var interval = Math.round(document.getElementById(`${id}-message-interval-range`).value);
    document
      .getElementById(`${id}-message-button`)
      .click();
    setTimeout(messageInterval, interval, id);
  }
}

function toneInterval(id){
  if(document.getElementById(`${id}-tone-interval-toggle`).checked){
    if(document.getElementById(`${id}-interval-random-toggle`).checked){
      var range = document.getElementById(`${id}-tone-interval-range`);
      range.value = Math.round(randomRange(50,2500));
      range.dispatchEvent(new Event('input'));
    }
    if(document.getElementById(`${id}-duration-random-toggle`).checked){
      var range = document.getElementById(`${id}-duration-range`);
      range.value = Math.round(randomRange(2,8164));
      range.dispatchEvent(new Event('input'));
    }
    if(document.getElementById(`${id}-frequency-random-toggle`).checked){
      var range = document.getElementById(`${id}-frequency-range`);
      range.value = Math.round(randomRange(10,10000));
      range.dispatchEvent(new Event('input'));
    }
    if(document.getElementById(`${id}-shape-random-toggle`).checked){
      var select = document.getElementById(`${id}-shape-select`);
      select.selectedIndex = Math.round(Math.random() * (select.options.length-1));
    }
    var interval = Math.round(document.getElementById(`${id}-tone-interval-range`).value);
    document
      .getElementById(`${id}-tone-button`)
      .click();
    setTimeout(toneInterval, interval, id);
  }
}

function initControlPanel(){

  // EVENT LISTENERS
  document
    .getElementById(`networks-button`)
    .addEventListener('click', async (e) => {
      await updateNetworkList();
    });

 document
  .getElementById(`targets-button`)
  .addEventListener('click', async (e) => {
    try{
      targetList = null;
      e.target.textContent='working';
      e.target.disabled=true;
      var network = document.getElementById('networks-select').value;
      if(network){
        var parent = document.getElementById('target-panels');
        const response = await fetch(`/?action=get_targets&network=${network}`,{method:'POST'})
        if(response.ok){
          while (parent.hasChildNodes()){
            parent.firstChild.remove();
          }
          var { targets } = await response.json();
          targetList = targets;
          var panel;
          for(var i = 0; i < targets.length; i++){
            panel = createPanel(targets[i].ip);
            parent.appendChild(panel);
            await updateStatus(targets[i].ip);
          }
          parent.hidden = false;
        } else {
          parent.hidden = true;
        }
      }
    } catch(error){
      console.error(error)
    } finally {
      e.target.textContent='targets';
      e.target.disabled=false;
    }
  });

//MASTER PRINT
document
  .getElementById('master-print-toggle')
  .addEventListener('change', async (e) => {
    var toggle;
    for(var i = 0; i < targetList.length; i++){
      toggle = document.getElementById(`${targetList[i].ip}-print-toggle`);
      toggle.checked = e.target.checked;
      toggle.dispatchEvent(new Event('change'));
    }
  });

//MASTER COLOR
document
  .getElementById('master-color-toggle')
  .addEventListener('change', async (e) => {
    var toggle;
    for(var i = 0; i < targetList.length; i++){
      toggle = document.getElementById(`${targetList[i].ip}-color-toggle`);
      toggle.checked = e.target.checked;
      toggle.dispatchEvent(new Event('change'));
    }
  });

//MASTER SPECIAL CHARACTERS
document
  .getElementById('master-character-toggle')
  .addEventListener('change', async (e) => {
    var toggle;
    for(var i = 0; i < targetList.length; i++){
      toggle = document.getElementById(`${targetList[i].ip}-character-toggle`);
      toggle.checked = e.target.checked;
      toggle.dispatchEvent(new Event('change'));
    }
  });

//MASTER COLOR SHIFT
document
  .getElementById('master-color-shift-range')
  .addEventListener('input', async (e) => {
    document.getElementById('master-color-shift').textContent = e.target.value;
    var range;
    for(var i = 0; i < targetList.length; i++){
      range = document.getElementById(`${targetList[i].ip}-color-shift-range`);
      range.value = e.target.value;
      range.dispatchEvent(new Event('input'));
    }
  });

//MASTER COLOR SHIFT INTERVAL
document
  .getElementById('master-shift-interval-range')
  .addEventListener('input', async (e) => {
    document.getElementById('master-shift-interval').textContent = e.target.value;
  });
document
  .getElementById('master-shift-interval-toggle')
  .addEventListener('change', async (e) => {
    if(e.target.checked){
      masterShiftInterval();
    }
  });

//MASTER MONITOR MODE TOGGLE
document
  .getElementById('master-monitor-toggle')
  .addEventListener('change', async (e) => {
    for(var i = 0; i < targetList.length; i++){
      var toggle;
      toggle = document.getElementById(`${targetList[i].ip}-monitor-toggle`);
      if(toggle.disabled == false){
        toggle.checked = e.target.checked;
        toggle.dispatchEvent(new Event('change'));
      }
    }
  });

//MASTER WLAN1 CHANNEL RANGE
document
  .getElementById('master-channel-range')
  .addEventListener('input', async (e) => {
    document.getElementById('master-channel').textContent = e.target.value;
    for(var i = 0; i < targetList.length; i++){
      var range = document.getElementById(`${targetList[i].ip}-channel-range`);
      if(range.disabled == false ){
        range.value = e.target.value;
        range.dispatchEvent(new Event('input'));
      }
    }
  });

//MASTER WLAN1 CHANNEL INTERVAL
document
  .getElementById('master-channel-interval-range')
  .addEventListener('input', async (e) => {
    document.getElementById('master-channel-interval').textContent = e.target.value;
  });
document
  .getElementById('master-channel-interval-toggle')
  .addEventListener('change', async (e) => {
    if(e.target.checked){
      masterChannelInterval();
    }
  });

// MASTER MESSAGE SEND
document
  .getElementById('master-message-button')
  .addEventListener('click', async (e) => {
    var message = document.getElementById('master-message-content').value
    for(var i = 0; i < targetList.length; i++){
      var command = {
        "target" : targetList[i].ip,
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

// MASTER MESSAGE SEND
document
  .getElementById('master-message-interval-range')
  .addEventListener('input', async (e) => {
    document.getElementById('master-message-interval').value = e.target.value;
  });
document
  .getElementById('master-message-interval-toggle')
  .addEventListener('change', async (e) => {
    if(e.target.checked){
      masterMessageInterval();
    }
  });


//MASTER FLOOD
document
  .getElementById('master-message-flood-delay-range')
  .addEventListener('input', async (e) => {
    document.getElementById('master-message-flood-delay').textContent = parseFloat(e.target.value).toFixed(3);
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
    for(var i = 0; i < targetList.length; i++){
      var command = {
        "target" : targetList[i].ip,
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

// MASTER TONE EVENT LISTENERS

document
  .getElementById('master-frequency')
  .addEventListener('change', async (e) => {
    document.getElementById('master-frequency-range').value = e.target.value;
  });
document
  .getElementById('master-duration')
  .addEventListener('change', async (e) => {
    document.getElementById('master-duration-range').value = e.target.value;
  });
document
  .getElementById('master-frequency-range')
  .addEventListener('input', async (e) => {
    document.getElementById('master-frequency').value = e.target.value;
  });
document
  .getElementById('master-duration-range')
  .addEventListener('input', async (e) => {
    document.getElementById('master-duration').value = e.target.value;
  });
document
  .getElementById('master-tone-button')
  .addEventListener('click', async (e) => {
    var frequency = document.getElementById('master-frequency-range').value;
    var duration = document.getElementById('master-duration-range').value;
    var shape = document.getElementById('master-shape-select').value;
    for(var i = 0; i < targetList.length ;i++){
      var command = {
        "target" : targetList[i].ip,
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
    document.getElementById('master-tone-interval').value = e.target.value;
  });
document
  .getElementById('master-tone-interval')
  .addEventListener('input', async (e) => {
    document.getElementById('master-tone-interval-range').value = e.target.value;
  });
document
  .getElementById('master-tone-interval-toggle')
  .addEventListener('change', async (e) => {
    if(e.target.checked){
      masterToneInterval();
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
    for(var i = 0; i < targetList.length ;i++){
      var command = {
        "target" : targetList[i].ip,
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
  if(document.getElementById('master-shift-interval-toggle').checked){
    var interval = Math.round(document.getElementById('master-shift-interval-range').value);
    var range = document.getElementById('master-color-shift-range');
    range.value = Math.round(255*Math.random());
    range.dispatchEvent(new Event('input'));
    setTimeout(masterShiftInterval, interval);
  }
}

function masterChannelInterval(){
  if(document.getElementById('master-channel-interval-toggle').checked){
    var interval = Math.round(document.getElementById('master-channel-interval-range').value);
    var range = document.getElementById('master-channel-range');
    range.value = Math.round(13*Math.random());
    range.dispatchEvent(new Event('input'));
    setTimeout(masterChannelInterval, interval);
  }
}

function masterToneInterval(){
  if(document.getElementById('master-tone-interval-toggle').checked){
    var interval = Math.round(document.getElementById('master-tone-interval-range').value);
    document
      .getElementById('master-tone-button')
      .click();
    setTimeout(masterToneInterval, interval);
  }
}

function masterMessageInterval(){
  if(document.getElementById('master-message-interval-toggle').checked){
    var interval = Math.round(document.getElementById('master-message-interval-range').value);
    document
      .getElementById('master-message-button')
      .click();
    setTimeout(masterMessageInterval, interval);
  }
}

