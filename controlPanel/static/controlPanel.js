

(function() {
  'use strict';

  var apLists = {};
  var targetList;
  var selectedInterfaces = {};

  window.addEventListener('load', async function() {
    await updateNetworkList();
    initControlPanel();
  }, false);

  var networkSSIDs = [
    'UAP',
    'Public WiFi',
    '_Free Public WiFi_',
    'DEN Airport Free WiFi',
    'DEN Airport Free WiFi 2.4',
  ]

  //----------------------------------------------------------------
  // HTML node menu

  const row = document.createElement('div');
  row.setAttribute('class', 'row align-items-center justify-content-center text-center');

  const col = document.createElement('div');
  col.setAttribute('class', 'col text-center');

  const formToggleDiv = document.createElement('div');
  formToggleDiv.setAttribute('class','d-inline-block form-check form-switch');

  const formCheckDiv = document.createElement('div');
  formCheckDiv.setAttribute('class','form-check');

  const toggle = document.createElement('input');
  toggle.setAttribute('class', 'form-check-input m-1');
  toggle.setAttribute('type', 'checkbox');

  const hr = document.createElement('hr');

  const formCheckLabel = document.createElement('label');
  formCheckLabel.setAttribute('class','form-check-label m-1');

  const formLabel = document.createElement('label');
  formLabel.setAttribute('class','form-label m-1');

  const range = document.createElement('input');
  range.setAttribute('type', 'range');
  range.setAttribute('class', 'form-range m-1');

  const button = document.createElement('button');
  button.setAttribute('class', 'btn btn-sm btn-outline-secondary m-1');

  const select = document.createElement('select');
  select.setAttribute('class','form-select m-1');

  //----------------------------------------------------------------

  function removeOptions(selectElement) {
     let i, L = selectElement.options.length - 1;
     for(i = L; i >= 0; i--) {
        selectElement.remove(i);
     }
  }

  //----------------------------------------------------------------

  function randomRange(min=0, max=0){
    if (max === min){
      return 0.0;
    } else if (min > max) {
      let smaller = max;
      max = min;
      min = smaller;
    }
    let diff = max - min;
    return diff*Math.random()+min;
  }

  //----------------------------------------------------------------
  // Returns an object where the key "networks" have a value of a list
  // of objects with "interface" and "address" keys.
  // These are network devices on the local controller device

  async function fetchNetworks(){
    return await fetch('networks', {method: "GET"})
    .then(async (response) => await response.json())
    .catch((error) => console.error(error));
  }

  //----------------------------------------------------------------

  async function updateAPSelect(target_ip, index){
    await fetch(
      `access-point?target=${target_ip}`,
      {method: 'GET'}
    )
    .then(async (response) => await response.json())
    .then((ap_list) => {
      let select = document.getElementById(`${target_ip}-ssid-select-${index}`);
      removeOptions(select);
      let option;

      // if (!ap_list.online){
      //   option = document.createElement('option');
      //   option.textContent = 'unreachable';
      //   select.appendChild(option);
      //   select.disabled = true; 
      //   return
      // }

      apLists[target_ip] = ap_list;
      for(let k = 0 ; k < networkSSIDs.length; k++){
        option = document.createElement('option');
        option.setAttribute('value', networkSSIDs[k]);
        option.textContent = networkSSIDs[k];
        select.appendChild(option);
      }
      let keys = Object.keys(ap_list.aps);
      for(let j = 0 ; j < keys.length; j++){
        option = document.createElement('option');
          option.setAttribute('value',keys[j]);
          option.textContent = `${keys[j]} - ${ap_list.aps[keys[j]].count}`;
          select.appendChild(option);
      }
      select.selectedIndex = 0;

    })
    .catch((error) => console.error(error));
  }

  //----------------------------------------------------------------

  async function updateStatus(ip, index){

    await updateInterfaceSection(ip, 0);
    await updateInterfaceSection(ip, 1);

    await fetch(`get?resource=state&target=${ip}`, {method: 'GET'})
    .then(async (response) => await response.json())
    .then((state) => {

      if (!state){
        document.getElementById(`${ip}-title`).textContent = "unreachable";
        return
      }

      document.getElementById(`${ip}-print-toggle`).checked = state.print_enable;
      document.getElementById(`${ip}-color-toggle`).checked = state.color_enable;
      document.getElementById(`${ip}-linebreaks-toggle`).checked = state.linebreaks_enable;
      document.getElementById(`${ip}-color-shift-range`).value = state.color_shift;
      document.getElementById(`${ip}-color-shift`).textContent = state.color_shift;
      document.getElementById(`${ip}-title`).textContent = ip;

    })
    .catch((error) => console.error(error));
  }

  //----------------------------------------------------------------
  // Callback for the "networks" button
  // Populates adjacent dropbown

  async function updateNetworkList(){
    await fetchNetworks()
    .then(({networks}) => {
      if (!networks) return;
      console.log('networks:',networks);
      let select = document.getElementById('networks-select');
      for (let i = select.options.length - 1; i >=0; i--){
        select.options[i].remove();
      }
      networks.forEach(iface => {
        let option = document.createElement('option');
        option.setAttribute('value', iface['address']);
        option.textContent=`${iface['interface']}:${iface['address']}`;
        select.appendChild(option);
      })
    })
    .catch(error => console.error(error));
  }

  //----------------------------------------------------------------

  async function getInterfaceState(ip, iface){
    return await fetch(`get?target=${ip}&resource=interface_state&interface=${iface}`, {method: 'GET'})
    .then(async (response) => await response.json())
    .catch(error => console.error(error));
  }

  async function updateInterfaceSection(ip, index){
    const socket_state = await fetch(`get?resource=socket_state&target=${ip}&index=${index}`)
    .then(async response => await response.json())
    .then(({state})=> {return state})
    .catch(error => console.error(error));

    console.log('socket_state', socket_state);
    if (!socket_state) return;

    selectedInterfaces[ip][`socket${index}`] = socket_state.interface;

    /* need to know:
    1. socket information
      1. interface name
      2. is the socket open?
    2. interface information
      1. is it a wireless interface?
        1. current mode
        2. current channel
    */

    const monitorModeToggle = document.getElementById(`${ip}-monitor-toggle-${index}`);
    const channelRange = document.getElementById(`${ip}-channel-range-${index}`);
    const channelIntervalRange = document.getElementById(`${ip}-channel-interval-range-${index}`);
    const channelIntervalToggle = document.getElementById(`${ip}-channel-interval-toggle-${index}`);
    const channelIndicator = document.getElementById(`${ip}-channel-${index}`);
    const rogueAPToggle = document.getElementById(`${ip}-ap-toggle-${index}`);
    const rogueAPSelect = document.getElementById(`${ip}-ssid-select-${index}`);
    const rogueAPButton = document.getElementById(`${ip}-ssid-button-${index}`);

    if (socket_state.wifi_info === null){
      monitorModeToggle.disabled = true;
      channelRange.disabled = true;
      channelIntervalRange.disabled = true;
      channelIntervalToggle.disabled = true;
      channelIndicator.textContent='-';
      rogueAPToggle.disabled = true;
      rogueAPSelect.disabled = true;
      rogueAPButton.disabled = true;
    } else {
      monitorModeToggle.disabled = ! new Set(socket_state.wifi_info.modes).has('monitor');
      monitorModeToggle.checked = socket_state.wifi_info.current_mode === "monitor";
      channelRange.disabled = false;
      channelRange.value = socket_state.wifi_info.current_channel;
      channelIndicator.textContent=socket_state.wifi_info.current_channel;
      channelIntervalRange.disabled = false;
      channelIntervalToggle.disabled = false;
      rogueAPToggle.disabled = false;
      rogueAPSelect.disabled = false;
      rogueAPButton.disabled = false;
    }
  }

  //----------------------------------------------------------------

  function createWifiRows(target){
    console.log("target", target);
    var interfaceDivs = [];

    for(let i = 0; i < target.state.audio_channels; i++){
      var socket = target.state.sockets.sockets[i];

      var interfaceDiv = document.createElement('div');
        var titleRow = row.cloneNode();
        titleRow.textContent = `Socket ${i+1} interface:`;
          var interfaceCol = col.cloneNode();
            var interfaceSelect = select.cloneNode();
            interfaceSelect.setAttribute('id', `${target.ip}-interface-select-${i}`);

            var option = document.createElement('option');
            option.value = "";
            option.textContent = "choose an interface";
            interfaceSelect.appendChild(option);

            target.state.interfaces.forEach(iface => {
              var option = document.createElement('option');
              option.setAttribute('value', iface['interface']);
              option.textContent=`${iface['interface']}`;
              interfaceSelect.appendChild(option);
              if(iface.interface === socket.interface){
                interfaceSelect.value = iface.interface;
              }
            });

            interfaceSelect.addEventListener('change', async (e) => {
              if (! e.target.value) return;
              // const state = await getInterfaceState(target.ip, e.target.value);
              // console.log(`state of ${target.ip}'s ${e.target.value} interface:`, state);

              var command = {
                "target" : target.ip,
                "attribute" : "socket_interface",
                "parameters" : {
                  "interface" : e.target.value,
                  "index" : i
                }
              };
              await fetch(`set`, {
                method: "POST",
                body: JSON.stringify(command)
              });
              await updateInterfaceSection(target.ip, i);
            });

          interfaceCol.appendChild(interfaceSelect);
        titleRow.appendChild(interfaceCol);
      interfaceDiv.appendChild(titleRow);

        var wifiRow = row.cloneNode();
          var wifiMonitorCol = col.cloneNode();
            var wifiMonitorToggleDiv = formToggleDiv.cloneNode();
              var wifiMonitorToggle = toggle.cloneNode();
              wifiMonitorToggle.setAttribute('id',`${target.ip}-monitor-toggle-${i}`);
              wifiMonitorToggle.addEventListener('change', async (e) => {
                e.target.disabled = true;
                var command = {
                  "target" : target.ip,
                  "attribute" : "wlan_monitor_mode",
                  "parameters" : {
                    "interface" : null || selectedInterfaces[target.ip][`socket${i}`],
                    "monitor" : e.target.checked,
                    "channel" : parseInt(document.getElementById(`${target.ip}-channel-range-${i}`).value)
                  }
                };
                await fetch(`set`, {
                  method: "POST",
                  body: JSON.stringify(command)
                });
                e.target.disabled = false;
              });
              var wifiMonitorToggleLabel = formCheckLabel.cloneNode();
              wifiMonitorToggleLabel.setAttribute('for',`${target.ip}-monitor-toggle-${i}`);
              wifiMonitorToggleLabel.textContent=`monitor mode`;
            wifiMonitorToggleDiv.appendChild(wifiMonitorToggle);
            wifiMonitorToggleDiv.appendChild(wifiMonitorToggleLabel);
          wifiMonitorCol.appendChild(wifiMonitorToggleDiv);
        wifiRow.appendChild(wifiMonitorCol);

          var wifiChannelCol = col.cloneNode();
            var wifiChannelRangeLabel = formLabel.cloneNode();
            wifiChannelRangeLabel.setAttribute('for', `${target.ip}-channel-range-${i}`);
            wifiChannelRangeLabel.textContent='channel';
            var wifiChannelRange = range.cloneNode();
            wifiChannelRange.setAttribute('class','form-range w-75');
            wifiChannelRange.setAttribute('min','1');
            wifiChannelRange.setAttribute('max','13');
            wifiChannelRange.setAttribute('step','1');
            wifiChannelRange.setAttribute('value','1');
            wifiChannelRange.setAttribute('id',`${target.ip}-channel-range-${i}`);
            wifiChannelRange.addEventListener('input', async (e) => {
              document.getElementById(`${target.ip}-channel-${i}`).textContent = e.target.value;
              var command = {
                "target" : target.ip,
                "attribute" : "wlan_channel",
                "parameters" : {
                  "interface" : null || selectedInterfaces[target.ip][`socket${i}`],
                  "channel" : parseInt(e.target.value)
                }
              };
              await fetch(`set`, {
                method: "POST",
                body: JSON.stringify(command)
              });
            });
            var wifiChannelIndicator = document.createElement('span');
            wifiChannelIndicator.setAttribute('id',`${target.ip}-channel-${i}`);
            wifiChannelIndicator.textContent='-';
          wifiChannelCol.appendChild(wifiChannelRangeLabel);
          wifiChannelCol.appendChild(wifiChannelRange);
          wifiChannelCol.appendChild(wifiChannelIndicator);
        wifiRow.appendChild(wifiChannelCol);
      interfaceDiv.appendChild(wifiRow);

        var wifiIntervalRow = row.cloneNode();
          var wifiIntervalCol = col.cloneNode();
            var wifiIntervalRangeLabel = formLabel.cloneNode();
            wifiIntervalRangeLabel.setAttribute('for',`${target.ip}-channel-interval-range-${i}`);
            wifiIntervalRangeLabel.textContent='interval';
            var wifiIntervalRange = range.cloneNode();
            wifiIntervalRange.setAttribute('class','form-range w-50');
            wifiIntervalRange.setAttribute('min','25');
            wifiIntervalRange.setAttribute('max','2500');
            wifiIntervalRange.setAttribute('step','1');
            wifiIntervalRange.setAttribute('value','1000');
            wifiIntervalRange.setAttribute('id',`${target.ip}-channel-interval-range-${i}`);
            wifiIntervalRange.addEventListener('input', async (e) => {
              document.getElementById(`${target.ip}-channel-interval-${i}`).textContent = e.target.value;
            });
            var wifiIntervalIndicator = document.createElement('span');
            wifiIntervalIndicator.setAttribute('id',`${target.ip}-channel-interval-${i}`);
            wifiIntervalIndicator.textContent='1000';
          wifiIntervalCol.appendChild(wifiIntervalRangeLabel);
          wifiIntervalCol.appendChild(wifiIntervalRange);
          wifiIntervalCol.appendChild(wifiIntervalIndicator);
          var wifiIntervalToggleCol = col.cloneNode();
            var wifiIntervalToggleDiv = formToggleDiv.cloneNode();
              var wifiIntervalToggle = toggle.cloneNode();
              wifiIntervalToggle.setAttribute('id',`${target.ip}-channel-interval-toggle-${i}`);
              wifiIntervalToggle.addEventListener('change', e => {
                if(e.target.checked){
                  channelInterval(target.ip);
                }
              });
              var wifiIntervalToggleLabel = formCheckLabel.cloneNode();
              wifiIntervalToggleLabel.setAttribute('for',`${target.ip}-channel-interval-toggle-${i}`);
              wifiIntervalToggleLabel.textContent='repeat';
            wifiIntervalToggleDiv.appendChild(wifiIntervalToggle);
            wifiIntervalToggleDiv.appendChild(wifiIntervalToggleLabel);
          wifiIntervalToggleCol.appendChild(wifiIntervalToggleDiv);
        wifiIntervalRow.appendChild(wifiIntervalCol);
        wifiIntervalRow.appendChild(wifiIntervalToggleCol);
      interfaceDiv.appendChild(wifiIntervalRow);

        //----------------------------------------------------------------
        // Section for setting up Rogue APs

        var rogueAPRow = row.cloneNode();
          var rogueAPSSIDCol = document.createElement('div');
          rogueAPSSIDCol.setAttribute('class','col-1');
            var rogueAPSSIDButton = button.cloneNode();
            rogueAPSSIDButton.setAttribute('id',`${target.ip}-ssid-button-${i}`);
            rogueAPSSIDButton.textContent='+';
            rogueAPSSIDButton.addEventListener('click', async (e) =>{
              await updateAPSelect(target.ip, i);
            });
          rogueAPSSIDCol.appendChild(rogueAPSSIDButton);
          var rogueAPSelectCol = document.createElement('div');
          rogueAPSelectCol.setAttribute('class','col-10');
            var rogueAPSelect = select.cloneNode();
            rogueAPSelect.setAttribute('id',`${target.ip}-ssid-select-${i}`);
          rogueAPSelectCol.appendChild(rogueAPSelect);
          var rogueAPSSIDToggleCol = document.createElement('div');
          rogueAPSSIDToggleCol.setAttribute('class','col-1');
            var rogueAPSSIDToggle = toggle.cloneNode();
            rogueAPSSIDToggle.setAttribute('id',`${target.ip}-ap-toggle-${i}`);
            rogueAPSSIDToggle.addEventListener('change', async (e) => {
              var ssid = document.getElementById(`${target.ip}-ssid-select-${i}`).value;
              document.getElementById(`${target.ip}-monitor-toggle-${i}`).disabled = e.target.checked;
              document.getElementById(`${target.ip}-channel-range-${i}`).disabled = e.target.checked;
              var toggle = document.getElementById(`${target.ip}-channel-interval-toggle-${i}`);
              toggle.checked = false;
              toggle.disabled = e.target.checked;
              toggle.dispatchEvent(new Event('change'));
              var command; 
              var MAC = null;
              console.log(apLists);
              if(apLists[target.ip].aps[ssid]){
                if(apLists[target.ip].aps[ssid]['mac_address']){
                  MAC = apLists[target.ip].aps[ssid].MACs[0];
                }
              }
              if(e.target.checked){
                command = {
                  "target" : target.ip,
                  'action' : 'start_ap',
                  'parameters' : {
                    'interface': socket ? socket.interface : null,
                    "ssid": ssid,
                    "ip_address": `10.10.${i+1}0.1`,
                    "password": null,
                    "mac_address": MAC,
                    'channel' : 5 //or random?
                  }
                }
              } else {
                command = {
                  "target" : target.ip,
                  'action' : 'stop_ap',
                  'parameters' : {
                    'interface' : socket ? socket.interface : null,
                  }
                }
              }
              fetch(`run`, {
                method: "POST",
                body: JSON.stringify(command)
              });
            });
          rogueAPSSIDToggleCol.appendChild(rogueAPSSIDToggle)
          rogueAPRow.appendChild(rogueAPSSIDCol);
          rogueAPRow.appendChild(rogueAPSelectCol);
          rogueAPRow.appendChild(rogueAPSSIDToggleCol);
        interfaceDiv.appendChild(rogueAPRow);
      interfaceDivs.push(interfaceDiv);
    }
    console.log('interfaceDivs',interfaceDivs);
    return interfaceDivs;
  }

  //================================================================

  function createPanel(target){

    //----------------------------------------------------------------
    //Construction

    
    // Main Panel
    var panel = document.createElement('div');
    panel.setAttribute('class','col-6 border border-1 rounded p-3');
    panel.setAttribute('id',`${target.ip}`);

      // Title is basically just the IP of the target
      var title = document.createElement('p');
      title.setAttribute('class','text-center h4');
      title.setAttribute('id',`${target.ip}-title`);
      title.textContent =`${target.ip}`;
      
      //----------------------------------------------------------------
      // Text manipulation controls
      // Should be hidden if target.state.writers === null

      var writerDiv = document.createElement('div');
      writerDiv.appendChild(hr.cloneNode());
      if (target.state.writer === null) writerDiv.hidden = true;
      
        var textRow = row.cloneNode();
          var printCol = col.cloneNode();
            var printToggleDiv = formToggleDiv.cloneNode();
              var printToggle = toggle.cloneNode();
              printToggle.setAttribute('id',`${target.ip}-print-toggle`);
              printToggle.addEventListener('change', async (e) => {
                e.target.disabled = true;
                var command = {
                  "target" : target.ip,
                  "attribute" : "print_enable",
                  "parameters" : {
                    "value" : e.target.checked
                  }
                };
                await fetch(`set`, {
                  method: "POST",
                  body: JSON.stringify(command)
                });
                e.target.disabled = false;
              });
              var printToggleLabel = formCheckLabel.cloneNode();
              printToggleLabel.setAttribute('for',`${target.ip}-print-toggle`);
              printToggleLabel.textContent =`print`;
            printToggleDiv.appendChild(printToggle);
            printToggleDiv.appendChild(printToggleLabel);
          printCol.appendChild(printToggleDiv);

          var charactersCol = col.cloneNode();
            var charactersToggleDiv = formToggleDiv.cloneNode();
              var charactersToggle = toggle.cloneNode();
              charactersToggle.setAttribute('id',`${target.ip}-linebreaks-toggle`);
              charactersToggle.addEventListener('change', async (e) => {
                e.target.disabled = true;
                var command = {
                  "target" : target.ip,
                  "attribute" : "linebreaks_enable",
                  "parameters": {
                    "value" : e.target.checked
                  }
                };
                await fetch(`set`, {
                  method: "POST",
                  body: JSON.stringify(command)
                });
                e.target.disabled = false;
              });
              var charactersToggleLabel = formCheckLabel.cloneNode();
              charactersToggleLabel.setAttribute('for',`${target.ip}-linebreaks-toggle`);
              charactersToggleLabel.textContent =`special chars`;
            charactersToggleDiv.appendChild(charactersToggle);
            charactersToggleDiv.appendChild(charactersToggleLabel);
          charactersCol.appendChild(charactersToggleDiv);
          var colorCol = col.cloneNode();
            var colorToggleDiv = formToggleDiv.cloneNode();
              var colorToggle = toggle.cloneNode();
              colorToggle.setAttribute('id',`${target.ip}-color-toggle`);
              colorToggle.addEventListener('change', async (e) => {
                e.target.disabled = true;
                var command = {
                  "target" : target.ip,
                  "attribute" : "color_shift",
                  "parameters" : {
                    "value" : e.target.checked
                  }
                };
                await fetch(`set`, {
                  method: "POST",
                  body: JSON.stringify(command)
                });
                e.target.disabled = false;
              });
              var colorToggleLabel = formCheckLabel.cloneNode();
              colorToggleLabel.setAttribute('for',`${target.ip}-color-toggle`);
              colorToggleLabel.textContent =`color`;
            colorToggleDiv.appendChild(colorToggle);
            colorToggleDiv.appendChild(colorToggleLabel);
          colorCol.appendChild(colorToggleDiv);
        textRow.appendChild(printCol);
        textRow.appendChild(charactersCol);
        textRow.appendChild(colorCol);
      writerDiv.appendChild(textRow);

        var colorShiftRow = row.cloneNode();
          var colorShiftCol = col.cloneNode();
            var colorShiftRangeLabel = formLabel.cloneNode();
            colorShiftRangeLabel.setAttribute('for',`${target.ip}-color-shift-range`);
            colorShiftRangeLabel.textContent='color shift'
            var colorShiftRange = range.cloneNode();
            colorShiftRange.setAttribute('class','form-range w-75');
            colorShiftRange.setAttribute('min','0');
            colorShiftRange.setAttribute('max','255');
            colorShiftRange.setAttribute('step','1');
            colorShiftRange.setAttribute('value','0');
            colorShiftRange.setAttribute('id',`${target.ip}-color-shift-range`);
            colorShiftRange.addEventListener('input', async (e) => {
              e.target.disabled = true;
              document.getElementById(`${target.ip}-color-shift`).textContent = e.target.value;
              var command = {
                "target" : target.ip,
                "attribute" : "color_shift",
                "parameters" : {
                  "value" : e.target.value
                }
              };
              await fetch(`set`, {
                method: "POST",
                body: JSON.stringify(command)
              });
              e.target.disabled = false;
            });
            var colorShiftIndicator = document.createElement('span');
            colorShiftIndicator.setAttribute('id',`${target.ip}-color-shift`);
            colorShiftIndicator.textContent = '0';
          colorShiftCol.appendChild(colorShiftRangeLabel);
          colorShiftCol.appendChild(colorShiftRange);
          colorShiftCol.appendChild(colorShiftIndicator);
        colorShiftRow.appendChild(colorShiftCol);
      writerDiv.appendChild(colorShiftRow);

        var colorShiftIntervalRow = row.cloneNode();
          var colorShiftIntervalCol = col.cloneNode();
            var colorShiftIntervalRangeLabel = formLabel.cloneNode();
            colorShiftIntervalRangeLabel.setAttribute('for',`${target.ip}-shift-interval-range`);
            colorShiftIntervalRangeLabel.textContent='interval';
            var colorShiftIntervalRange = range.cloneNode();
            colorShiftIntervalRange.setAttribute('class','form-range w-50');
            colorShiftIntervalRange.setAttribute('min','25');
            colorShiftIntervalRange.setAttribute('max','2500');
            colorShiftIntervalRange.setAttribute('step','1');
            colorShiftIntervalRange.setAttribute('value','1000');
            colorShiftIntervalRange.setAttribute('id',`${target.ip}-shift-interval-range`);
            colorShiftIntervalRange.addEventListener('input', e => {
              document.getElementById(`${target.ip}-shift-interval`).textContent = e.target.value;
            });
            var colorShiftIntervalIndicator = document.createElement('span');
            colorShiftIntervalIndicator.setAttribute('id',`${target.ip}-shift-interval`);
            colorShiftIntervalIndicator.textContent = '1000';
          colorShiftIntervalCol.appendChild(colorShiftIntervalRangeLabel);
          colorShiftIntervalCol.appendChild(colorShiftIntervalRange);
          colorShiftIntervalCol.appendChild(colorShiftIntervalIndicator);
          var colorShiftIntervalToggleCol = col.cloneNode();
            var colorShiftIntervalToggleDiv = formToggleDiv.cloneNode();
              var colorShiftIntervalToggle = toggle.cloneNode();
              colorShiftIntervalToggle.setAttribute('id',`${target.ip}-shift-interval-toggle`);
              colorShiftIntervalToggle.addEventListener('change', e => {
                if(e.target.checked){
                  shiftInterval(target.ip);
                }
              });
              var colorShiftIntervalToggleLabel = formCheckLabel.cloneNode();
              colorShiftIntervalToggleLabel.setAttribute('for',`${target.ip}-shift-interval-toggle`);
              colorShiftIntervalToggleLabel.textContent = 'repeat';
            colorShiftIntervalToggleDiv.appendChild(colorShiftIntervalToggle);
            colorShiftIntervalToggleDiv.appendChild(colorShiftIntervalToggleLabel);
          colorShiftIntervalToggleCol.appendChild(colorShiftIntervalToggleDiv);
        colorShiftIntervalRow.appendChild(colorShiftIntervalCol);
        colorShiftIntervalRow.appendChild(colorShiftIntervalToggleCol);
      writerDiv.appendChild(colorShiftIntervalRow);

      //----------------------------------------------------------------
      // Socket Controls
      // By default, there will be two slots. One for each analog output on the Raspberry Pi
      
      var interfaceDivs = createWifiRows(target);

      //----------------------------------------------------------------
      // Pings and Scans

      var messageRow = row.cloneNode();
        var messageCol = col.cloneNode();
          var messageInput = document.createElement('textarea');
          messageInput.setAttribute('class','form-control');
          messageInput.setAttribute('id',`${target.ip}-message-content`);
          messageInput.setAttribute('name','message');
          messageInput.setAttribute('rows','3');
          messageInput.setAttribute('placeholder','Send a message.');
        messageCol.appendChild(messageInput);
      messageRow.appendChild(messageCol);

      var sendRow = row.cloneNode();
        var sendCol = col.cloneNode();
          var sendButton = button.cloneNode();
          sendButton.setAttribute('id',`${target.ip}-message-button`);
          sendButton.textContent='send';
          sendButton.addEventListener('click', async (e) => {
            e.target.disabled = true;
            var message = document.getElementById(`${target.ip}-message-content`).value
            var command = {
              "command" : "nping_icmp_oneshot",
              "parameters" : {
                "target" : target.ip,
                "message" : message
              }
            };
            await fetch('run', {
              method: "POST",
              body: JSON.stringify(command)
            });
            e.target.disabled = false;
          });
        sendCol.appendChild(sendButton);
      sendRow.appendChild(sendCol);

      var messageIntervalRow = row.cloneNode();
        var messageIntervalCol = col.cloneNode();
          var messageIntervalRangeLabel = formLabel.cloneNode();
          messageIntervalRangeLabel.setAttribute('for',`${target.ip}-message-interval-range`);
          messageIntervalRangeLabel.textContent='interval';
          var messageIntervalRange = range.cloneNode();
          messageIntervalRange.setAttribute('class','form-range w-75');
          messageIntervalRange.setAttribute('min','25');
          messageIntervalRange.setAttribute('max','2500');
          messageIntervalRange.setAttribute('step','1');
          messageIntervalRange.setAttribute('value','1000');
          messageIntervalRange.setAttribute('id',`${target.ip}-message-interval-range`);
          messageIntervalRange.addEventListener('input', e => {
            document.getElementById(`${target.ip}-message-interval`).textContent = e.target.value;
          });
          var messageIntervalIndicator = document.createElement('span');
          messageIntervalIndicator.setAttribute('id',`${target.ip}-message-interval`);
          messageIntervalIndicator.textContent='1000';
        messageIntervalCol.appendChild(messageIntervalRangeLabel);
        messageIntervalCol.appendChild(messageIntervalRange);
        messageIntervalCol.appendChild(messageIntervalIndicator);
        var messageIntervalToggleCol = col.cloneNode();
          var messageIntervalToggleDiv = formToggleDiv.cloneNode();
            var messageIntervalToggle = toggle.cloneNode();
            messageIntervalToggle.setAttribute('id',`${target.ip}-message-interval-toggle`);
            messageIntervalToggle.addEventListener('change', e => {
              if(e.target.checked){
                messageInterval(target.ip);
              }
            });
            var messageIntervalToggleLabel = formCheckLabel.cloneNode();
            messageIntervalToggleLabel.setAttribute('for',`${target.ip}-message-interval-toggle`);
            messageIntervalToggleLabel.textContent='repeat';
          messageIntervalToggleDiv.appendChild(messageIntervalToggle);
          messageIntervalToggleDiv.appendChild(messageIntervalToggleLabel);
        messageIntervalToggleCol.appendChild(messageIntervalToggleDiv);
      messageIntervalRow.appendChild(messageIntervalCol);
      messageIntervalRow.appendChild(messageIntervalToggleCol);

      var floodRow = row.cloneNode();
        var floodDelayCol = col.cloneNode();
          var floodDelayRangeLabel = formLabel.cloneNode();
          floodDelayRangeLabel.setAttribute('for',`${target.ip}-message-flood-delay-range`);
          floodDelayRangeLabel.textContent='delay';
          var floodDelayRange = range.cloneNode();
          floodDelayRange.setAttribute('class','form-range w-75');
          floodDelayRange.setAttribute('min','0.0');
          floodDelayRange.setAttribute('max','1.0');
          floodDelayRange.setAttribute('step','0.001');
          floodDelayRange.setAttribute('value','0.500');
          floodDelayRange.setAttribute('id',`${target.ip}-message-flood-delay-range`);
          floodDelayRange.addEventListener('input', e => {
            document.getElementById(`${target.ip}-message-flood-delay`).textContent = parseFloat(e.target.value).toFixed(3);
          });
          var floodDelayIndicator = document.createElement('span');
          floodDelayIndicator.setAttribute('id',`${target.ip}-message-flood-delay`);
          floodDelayIndicator.textContent='0.500';
        floodDelayCol.appendChild(floodDelayRangeLabel);
        floodDelayCol.appendChild(floodDelayRange);
        floodDelayCol.appendChild(floodDelayIndicator);

        var floodCountCol = col.cloneNode();
          var floodCountRangeLabel = formLabel.cloneNode();
          floodCountRangeLabel.setAttribute('for',`${target.ip}-message-flood-count-range`);
          floodCountRangeLabel.textContent='count';
          var floodCountRange = range.cloneNode();
          floodCountRange.setAttribute('class','form-range w-75');
          floodCountRange.setAttribute('min','1');
          floodCountRange.setAttribute('max','100');
          floodCountRange.setAttribute('step','1');
          floodCountRange.setAttribute('value','5');
          floodCountRange.setAttribute('id',`${target.ip}-message-flood-count-range`);
          floodCountRange.addEventListener('input', e => {
            document.getElementById(`${target.ip}-message-flood-count`).textContent = e.target.value;
          });
          var floodCountIndicator = document.createElement('span');
          floodCountIndicator.setAttribute('id',`${target.ip}-message-flood-count`);
          floodCountIndicator.textContent='5';
        floodCountCol.appendChild(floodCountRangeLabel);
        floodCountCol.appendChild(floodCountRange);
        floodCountCol.appendChild(floodCountIndicator);
      floodRow.appendChild(floodDelayCol);
      floodRow.appendChild(floodCountCol);

      var floodSendRow = row.cloneNode();
        var floodSendCol = col.cloneNode();
          var floodSendButton = button.cloneNode();
          floodSendButton.setAttribute('id',`${target.ip}-message-flood-button`);
          floodSendButton.textContent='flood';
          floodSendButton.addEventListener('click', async (e) => {
            e.target.disabled = true;
            var message = document.getElementById(`${target.ip}-message-content`).value;
            var delay = document.getElementById(`${target.ip}-message-flood-delay-range`).value;
            var count = document.getElementById(`${target.ip}-message-flood-count-range`).value;
            var command = {
              "command" : "nping_icmp_flood",
              "parameters" : {
                "target" : target.ip,
                "message" : message,
                "delay" : delay,
                "count" : count
              }
            };
            await fetch('run', {
              method: "POST",
              body: JSON.stringify(command)
            });
            e.target.disabled=false;
          });
        floodSendCol.appendChild(floodSendButton);
      floodSendRow.appendChild(floodSendCol);

      var toneShapeRow = row.cloneNode();
        var randomShapeCol = document.createElement('div');
        randomShapeCol.setAttribute('class','col-1');
          var randomShapeToggleDiv = formCheckDiv.cloneNode();
            var randomShapeToggle = toggle.cloneNode();
            randomShapeToggle.setAttribute('id',`${target.ip}-shape-random-toggle`);
            var randomShapeToggleLabel = formCheckLabel.cloneNode();
            randomShapeToggleLabel.setAttribute('for',`${target.ip}-shape-random-toggle`);
            randomShapeToggleLabel.textContent=`rand`;
          randomShapeToggleDiv.appendChild(randomShapeToggle);
          randomShapeToggleDiv.appendChild(randomShapeToggleLabel);
        randomShapeCol.appendChild(randomShapeToggleDiv);
        var shapeSelectCol = document.createElement('div');
        shapeSelectCol.setAttribute('class','col-11');
          var shapeSelect = select.cloneNode();
          shapeSelect.setAttribute('id',`${target.ip}-shape-select`);
            var options = ['sine', 'tri', 'square', 'random', 'noise'];
            var option;
            for(var i = 0; i < options.length; i++){
              option = document.createElement('option');
              option.value = options[i];
              option.textContent = options[i];
              if (options[i] == 'random'){
                option.selected = true;
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
            freqRandToggle.setAttribute('id',`${target.ip}-frequency-random-toggle`);
            var freqRandToggleLabel = formCheckLabel.cloneNode();
            freqRandToggleLabel.setAttribute('for',`${target.ip}-frequency-random-toggle`);
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
          freqRange.setAttribute('id',`${target.ip}-frequency-range`);
          freqRange.addEventListener('input', e => {
            document.getElementById(`${target.ip}-frequency`).value = e.target.value;
          });
          var freqRangeLabel = formLabel.cloneNode();
          freqRangeLabel.setAttribute('for',`${target.ip}-freq-range`);
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
          freqNumber.setAttribute('id',`${target.ip}-frequency`);
          freqNumber.addEventListener('change', e => {
            document.getElementById(`${target.ip}-frequency-range`).value = e.target.value;
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
            durationRandToggle.setAttribute('id',`${target.ip}-duration-random-toggle`);
            var durationRandToggleLabel = formCheckLabel.cloneNode();
            durationRandToggleLabel.setAttribute('for',`${target.ip}-duration-random-toggle`);
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
          durationRange.setAttribute('id',`${target.ip}-duration-range`);
          durationRange.addEventListener('input', e => {
            document.getElementById(`${target.ip}-duration`).value=e.target.value;
          });
          var durationRangeLabel = formLabel.cloneNode();
          durationRangeLabel.setAttribute('for',`${target.ip}-duration-range`);
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
          durationNumber.setAttribute('id',`${target.ip}-duration`);
          durationNumber.addEventListener('change', e => {
            document.getElementById(`${target.ip}-duration-range`).value = e.target.value;
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
            randomToneIntervalToggle.setAttribute('id',`${target.ip}-interval-random-toggle`);
            var randomToneIntervalToggleLabel = formCheckLabel.cloneNode();
            randomToneIntervalToggleLabel.setAttribute('for',`${target.ip}-interval-random-toggle`);
            randomToneIntervalToggleLabel.textContent=`rand`;
          randomToneIntervalToggleDiv.appendChild(randomToneIntervalToggle);
          randomToneIntervalToggleDiv.appendChild(randomToneIntervalToggleLabel);
        randomToneIntervalCol.appendChild(randomToneIntervalToggleDiv);
        var toneIntervalRangeCol = document.createElement('div');
        toneIntervalRangeCol.setAttribute('class','col-7');
          var toneIntervalRangeLabel = formLabel.cloneNode();
          toneIntervalRangeLabel.setAttribute('for',`${target.ip}-tone-interval-range`);
          toneIntervalRangeLabel.textContent='interval';
          var toneIntervalRange = range.cloneNode();
          toneIntervalRange.setAttribute('class','form-range w-75');
          toneIntervalRange.setAttribute('min','50');
          toneIntervalRange.setAttribute('max','2500');
          toneIntervalRange.setAttribute('step','1');
          toneIntervalRange.setAttribute('value','1000');
          toneIntervalRange.setAttribute('id',`${target.ip}-tone-interval-range`);
          toneIntervalRange.addEventListener('input', e => {
            document.getElementById(`${target.ip}-tone-interval`).value = e.target.value;
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
          toneIntervalNumber.setAttribute('id',`${target.ip}-tone-interval`);
          toneIntervalNumber.addEventListener('change', e => {
            document.getElementById(`${target.ip}-tone-interval-range`).value = e.target.value;
          });
        toneIntervalNumberCol.appendChild(toneIntervalNumber);
        var toneIntervalToggleCol = col.cloneNode();
          var toneIntervalToggleDiv = formToggleDiv.cloneNode();
            var toneIntervalToggle = toggle.cloneNode();
            toneIntervalToggle.setAttribute('id',`${target.ip}-tone-interval-toggle`);
            toneIntervalToggle.addEventListener('change', e => {
              if(e.target.checked){
                toneInterval(target.ip);
              }
            });
            var toneIntervalToggleLabel = formCheckLabel.cloneNode();
            toneIntervalToggleLabel.setAttribute('for',`${target.ip}-tone-interval-toggle`);
            toneIntervalToggleLabel.textContent='repeat';
            
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
          beepButton.setAttribute('id',`${target.ip}-tone-button`);
          beepButton.textContent='beep';
          beepButton.addEventListener('click', async (e) => {
            e.target.disabled = true;
            var frequency = document.getElementById(`${target.ip}-frequency-range`).value;
            var duration = document.getElementById(`${target.ip}-duration-range`).value;
            var shape = document.getElementById(`${target.ip}-shape-select`).value;
            var command = {
              "command" : "tone",
              "parameters" : {
                "target" : target.ip,
                "frequency": frequency,
                "amplitude": 1.0,
                "duration": duration,
                "shape": shape
              }
            };
            await fetch('run', {
              method: "POST",
              body: JSON.stringify(command)
            });
            e.target.disabled = false;
          });
        beepCol.appendChild(beepButton);
      beepRow.appendChild(beepCol);

      var scanRow = row.cloneNode();
        var scanModeCol = document.createElement('div');
        scanModeCol.setAttribute('class','col-2');
          var scanModeSelect = select.cloneNode();
          scanModeSelect.setAttribute('id',`${target.ip}-scan-mode-select`);
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
          scanOptionSyToggle.setAttribute('id',`${target.ip}-scan-option-sy`);
          var scanOptionSyLabel = formCheckLabel.cloneNode();
          scanOptionSyLabel.setAttribute('for',`${target.ip}-scan-option-sy`);
          scanOptionSyLabel.textContent = 'sY';
        scanOptionSyCol.appendChild(scanOptionSyToggle);
        scanOptionSyCol.appendChild(scanOptionSyLabel);
        var scanOptionSzCol = document.createElement('div');
        scanOptionSzCol.setAttribute('class','col-1');
          var scanOptionSzToggle = toggle.cloneNode();
          scanOptionSzToggle.setAttribute('id',`${target.ip}-scan-option-sz`);
          var scanOptionSzLabel = formCheckLabel.cloneNode();
          scanOptionSzLabel.setAttribute('for',`${target.ip}-scan-option-sz`);
          scanOptionSzLabel.textContent = 'sZ';
        scanOptionSzCol.appendChild(scanOptionSzToggle);
        scanOptionSzCol.appendChild(scanOptionSzLabel);
        var scanOptionScCol = document.createElement('div');
        scanOptionScCol.setAttribute('class','col-1');
          var scanOptionScToggle = toggle.cloneNode();
          scanOptionScToggle.setAttribute('id',`${target.ip}-scan-option-sc`);
          var scanOptionScLabel = formCheckLabel.cloneNode();
          scanOptionScLabel.setAttribute('for',`${target.ip}-scan-option-sc`);
          scanOptionScLabel.textContent = 'sC';
        scanOptionScCol.appendChild(scanOptionScToggle);
        scanOptionScCol.appendChild(scanOptionScLabel);
        var scanOptionSvCol = document.createElement('div');
        scanOptionSvCol.setAttribute('class','col-1');
          var scanOptionSvToggle = toggle.cloneNode();
          scanOptionSvToggle.setAttribute('id',`${target.ip}-scan-option-sv`);
          var scanOptionSvLabel = formCheckLabel.cloneNode();
          scanOptionSvLabel.setAttribute('for',`${target.ip}-scan-option-sv`);
          scanOptionSvLabel.textContent = 'sV';
        scanOptionSvCol.appendChild(scanOptionSvToggle);
        scanOptionSvCol.appendChild(scanOptionSvLabel);
        var scanOptionOCol = document.createElement('div');
        scanOptionOCol.setAttribute('class','col-1');
          var scanOptionOToggle = toggle.cloneNode();
          scanOptionOToggle.setAttribute('id',`${target.ip}-scan-option-o`);
          var scanOptionOLabel = formCheckLabel.cloneNode();
          scanOptionOLabel.setAttribute('for',`${target.ip}-scan-option-o`);
          scanOptionOLabel.textContent = 'O';
        scanOptionOCol.appendChild(scanOptionOToggle);
        scanOptionOCol.appendChild(scanOptionOLabel);
        var scanButtonCol = document.createElement('div');
        scanButtonCol.setAttribute('class','col-1');
          var scanButton = button.cloneNode();
          scanButton.setAttribute('id',`${target.ip}-scan-button`);
          scanButton.textContent='scan';
          scanButton.addEventListener('click', async (e) => {
            e.target.disabled = true;
            var args = [];
            args.push(document.getElementById(`${target.ip}-scan-mode-select`).value);
            if (document.getElementById(`${target.ip}-scan-option-sc`).checked){
              args.push("-sC");
            }
            if (document.getElementById(`${target.ip}-scan-option-sv`).checked){
              args.push("-sV");
            }
            if (document.getElementById(`${target.ip}-scan-option-sy`).checked){
              args.push("-sY");
            }
            if (document.getElementById(`${target.ip}-scan-option-sz`).checked){
              args.push("-sZ");
            }
            if (document.getElementById(`${target.ip}-scan-option-o`).checked){
              args.push("-O");
            }
            var command = {
              "command" : "scan",
              "parameters" : {
                "target" : target.ip,
                "args": args
              }
            };
            await fetch('run', {
              method: "POST",
              body: JSON.stringify(command)
            });
            e.target.disabled = false;
          });
        scanButtonCol.appendChild(scanButton);
      scanRow.appendChild(scanModeCol);
      scanRow.appendChild(scanOptionSyCol);
      scanRow.appendChild(scanOptionSzCol);
      scanRow.appendChild(scanOptionScCol);
      scanRow.appendChild(scanOptionSvCol);
      scanRow.appendChild(scanOptionOCol);
      scanRow.appendChild(scanButtonCol);

      

    panel.appendChild(title);
    panel.appendChild(writerDiv);

    panel.appendChild(hr.cloneNode());
    interfaceDivs.forEach(interfaceDiv => panel.appendChild(interfaceDiv));
    // panel.appendChild(wifiIntervalRow);
    // panel.appendChild(rogueAPRow);
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

    return panel
  }

  //----------------------------------------------------------------

  function shiftInterval(id){
    if(document.getElementById(`${id}-shift-interval-toggle`).checked){
      var interval = Math.round(document.getElementById(`${id}-shift-interval-range`).value);
      var range = document.getElementById(`${id}-color-shift-range`);
      range.value = Math.round(255*Math.random());
      range.dispatchEvent(new Event('input'));
      setTimeout(shiftInterval, interval, id);
    }
  }

  //----------------------------------------------------------------

  function channelInterval(id){
    if(document.getElementById(`${id}-channel-interval-toggle`).checked){
      var interval = Math.round(document.getElementById(`${id}-channel-interval-range`).value);
      var range = document.getElementById(`${id}-channel-range`);
      range.value = Math.round(13*Math.random());
      range.dispatchEvent(new Event('input'));
      setTimeout(channelInterval, interval, id);
    }
  }

  //----------------------------------------------------------------

  function messageInterval(id){
    if(document.getElementById(`${id}-message-interval-toggle`).checked){
      var interval = Math.round(document.getElementById(`${id}-message-interval-range`).value);
      document
        .getElementById(`${id}-message-button`)
        .click();
      setTimeout(messageInterval, interval, id);
    }
  }

  //----------------------------------------------------------------

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

  //----------------------------------------------------------------

  async function networkScan(network){
    const { targets } = await fetch(`/network-scan/${network}`, {method:'GET'})
    .then(async (response) => await response.json())
    .catch((error) => console.error(error));
    return targets
  }

  //================================================================

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
        targetList = null;
        e.target.textContent = 'working';
        e.target.disabled = true;
        const network = document.getElementById('networks-select').value;

        if(network){
          var parent = document.getElementById('target-panels');
          targetList = await networkScan(network);
          
          if (!targetList){
            parent.hidden = true;
          } else {

            while (parent.hasChildNodes()){
              parent.firstChild.remove();
            }

            let panel = null;
            for(var i = 0; i < targetList.length; i++){
              //initialize selected interfaces
              selectedInterfaces[targetList[i].ip] = {
                'socket1' : '',
                'socket2' : ''
              }
              panel = createPanel(targetList[i]);
              parent.appendChild(panel);
              await updateStatus(targetList[i].ip);
            }
            parent.hidden = false;
          }
        }

        e.target.textContent = 'targets';
        e.target.disabled = false;
    });

  //----------------------------------------------------------------
  //MASTER PRINT TOGGLE

  document
    .getElementById('master-print-toggle')
    .addEventListener('change', e => {
      if(targetList){
        var toggle;
        for(var i = 0; i < targetList.length; i++){
          toggle = document.getElementById(`${targetList[i].ip}-print-toggle`);
          toggle.checked = e.target.checked;
          toggle.dispatchEvent(new Event('change'));
        }
      }
    });

  //----------------------------------------------------------------
  //MASTER COLOR TOGGLE

  document
    .getElementById('master-color-toggle')
    .addEventListener('change', e => {
      if(targetList){
        var toggle;
        for(var i = 0; i < targetList.length; i++){
          toggle = document.getElementById(`${targetList[i].ip}-color-toggle`);
          toggle.checked = e.target.checked;
          toggle.dispatchEvent(new Event('change'));
        }
      }
    });

  //----------------------------------------------------------------
  //MASTER LINEBREAKS TOGGLE 

  document
    .getElementById('master-linebreaks-toggle')
    .addEventListener('change', e => {
      if(targetList){
        var toggle;
        for(var i = 0; i < targetList.length; i++){
          toggle = document.getElementById(`${targetList[i].ip}-linebreaks-toggle`);
          toggle.checked = e.target.checked;
          toggle.dispatchEvent(new Event('change'));
        }
      }
    });

  //----------------------------------------------------------------
  //MASTER COLOR SHIFT RANGE

  document
    .getElementById('master-color-shift-range')
    .addEventListener('input', e => {
      document.getElementById('master-color-shift').textContent = e.target.value;
      if(targetList){
        var range;
        for(var i = 0; i < targetList.length; i++){
          range = document.getElementById(`${targetList[i].ip}-color-shift-range`);
          range.value = e.target.value;
          range.dispatchEvent(new Event('input'));
        }
      }
    });

  //----------------------------------------------------------------
  //MASTER COLOR SHIFT INTERVAL

  document
    .getElementById('master-shift-interval-range')
    .addEventListener('input', e => {
      document.getElementById('master-shift-interval').textContent = e.target.value;
    });
  document
    .getElementById('master-shift-interval-toggle')
    .addEventListener('change', e => {
      if(e.target.checked){
        masterShiftInterval();
      }
    });

  //MASTER MONITOR MODE TOGGLE
  document
    .getElementById('master-monitor-toggle')
    .addEventListener('change', e => {
      if(targetList){
        for(var i = 0; i < targetList.length; i++){
          var toggle;
          toggle = document.getElementById(`${targetList[i].ip}-monitor-toggle`);
          if(toggle.disabled == false){
            toggle.checked = e.target.checked;
            toggle.dispatchEvent(new Event('change'));
          }
        }
      }
    });

  //MASTER WLAN1 CHANNEL RANGE
  document
    .getElementById('master-channel-range')
    .addEventListener('input', e => {
      document.getElementById('master-channel').textContent = e.target.value;
      if(targetList){
        for(var i = 0; i < targetList.length; i++){
          var range = document.getElementById(`${targetList[i].ip}-channel-range`);
          if(range.disabled == false ){
            range.value = e.target.value;
            range.dispatchEvent(new Event('input'));
          }
        }
      }
    });

  //----------------------------------------------------------------
  //MASTER WLAN1 CHANNEL INTERVAL
  document
    .getElementById('master-channel-interval-range')
    .addEventListener('input', e => {
      document.getElementById('master-channel-interval').textContent = e.target.value;
    });
  document
    .getElementById('master-channel-interval-toggle')
    .addEventListener('change', e => {
      if(e.target.checked){
        masterChannelInterval();
      }
    });

  //----------------------------------------------------------------
  // MASTER MESSAGE SEND
  document
    .getElementById('master-message-button')
    .addEventListener('click', async (e) => {
      var message = document.getElementById('master-message-content').value
      if(targetList){
        for(var i = 0; i < targetList.length; i++){
          var command = {
            "target" : targetList[i].ip,
            "command" : "nping_icmp_oneshot",
            "parameters" : {
              "message" : message
            }
          };
          fetch('run', {
            method: "POST",
            body: JSON.stringify(command)
          });
        }
      }
    });

  //----------------------------------------------------------------
  // MASTER MESSAGE SEND

  document
    .getElementById('master-message-interval-range')
    .addEventListener('input', async (e) => {
      document.getElementById('master-message-interval').textContent = e.target.value;
    });
  document
    .getElementById('master-message-interval-toggle')
    .addEventListener('change', async (e) => {
      if(e.target.checked){
        masterMessageInterval();
      }
    });


  //----------------------------------------------------------------
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
      if(targetList){
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
          fetch('run', {
            method: "POST",
            body: JSON.stringify(command)
          });
        }
      }
    });

  //----------------------------------------------------------------
  // MASTER TONE EVENT LISTENERS

  document
    .getElementById('master-frequency')
    .addEventListener('change', e => {
      document.getElementById('master-frequency-range').value = e.target.value;
    });
  document
    .getElementById('master-duration')
    .addEventListener('change', e => {
      document.getElementById('master-duration-range').value = e.target.value;
    });
  document
    .getElementById('master-frequency-range')
    .addEventListener('input', e => {
      document.getElementById('master-frequency').value = e.target.value;
    });
  document
    .getElementById('master-duration-range')
    .addEventListener('input', e => {
      document.getElementById('master-duration').value = e.target.value;
    });
  document
    .getElementById('master-tone-button')
    .addEventListener('click', async (e) => {
      if(targetList){
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
          await fetch('run', {
            method: "POST",
            body: JSON.stringify(command)
          });
        }
      }
    });
  document
    .getElementById('master-tone-interval-range')
    .addEventListener('input', e => {
      document.getElementById('master-tone-interval').value = e.target.value;
    });
  document
    .getElementById('master-tone-interval')
    .addEventListener('input', e => {
      document.getElementById('master-tone-interval-range').value = e.target.value;
    });
  document
    .getElementById('master-tone-interval-toggle')
    .addEventListener('change', e => {
      if(e.target.checked){
        masterToneInterval();
      }
    });

  //----------------------------------------------------------------
  // MASTER NMAP

  document
    .getElementById('master-nmap-button')
    .addEventListener('click', async (e) => {
        if(targetList){
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
          await fetch('run', {
            method: "POST",
            body: JSON.stringify(command)
          });
        }
      }
    });
  }

  //----------------------------------------------------------------
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

})();

