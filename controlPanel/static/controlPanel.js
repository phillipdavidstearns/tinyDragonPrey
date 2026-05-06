

(function() {
  'use strict';

  var apLists = {};
  var targetList;
  var selectedInterfaces = {};

  window.addEventListener('load', async function() {
    await updateNetworkList();
    initControlPanel();
  }, false);

  //----------------------------------------------------------------
  // HTML node menu

  const row = document.createElement('div');
  row.setAttribute('class', 'row align-items-center mb-2 flex-nowrap');

  const col = document.createElement('div');
  col.setAttribute('class', 'col text-center');

  const formToggleDiv = document.createElement('div');
  formToggleDiv.setAttribute('class','align-items-center form-check form-switch');

  const formCheckDiv = document.createElement('div');
  formCheckDiv.setAttribute('class','form-check');

  const toggle = document.createElement('input');
  toggle.setAttribute('class', 'form-check-input');
  toggle.setAttribute('type', 'checkbox');

  const hr = document.createElement('hr');

  const formCheckLabel = document.createElement('label');
  formCheckLabel.setAttribute('class','form-check-label');

  const formLabel = document.createElement('label');
  formLabel.setAttribute('class','form-label m-1');

  const rangeRow = document.createElement('div');
  rangeRow.setAttribute('class', 'row align-items-center');

  const rangeLabel = document.createElement('label');
  rangeLabel.setAttribute('class','col-3 form-label m-1');

  const range = document.createElement('input');
  range.setAttribute('type', 'range');
  range.setAttribute('class', 'col form-range');

  const rangeValue = document.createElement('label');
  rangeValue.setAttribute('class','col-2');

  const button = document.createElement('button');
  button.setAttribute('class', 'btn btn-sm btn-outline-secondary');

  const select = document.createElement('select');
  select.setAttribute('class','form-select');

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

  async function updateAPSelect(target_ip){
    await fetch(
      `access-point?target=${target_ip}`,
      {method: 'GET'}
    )
    .then(async (response) => await response.json())
    .then((ap_list) => {

      const index = targetList.findIndex(item => item.ip === target_ip);
      const state = targetList[index].state;

      for(let i = 0; i < state.audio_channels; i++){
        const select = document.getElementById(`${target_ip}-ssid-select-${i}`);
        removeOptions(select);

        if (!ap_list.online){
          let option = document.createElement('option');
          option.textContent = 'unreachable';
          select.appendChild(option);
          select.disabled = true; 
          return
        }

        apLists[target_ip] = ap_list;

        const keys = Object.keys(ap_list.aps);
        for(let j = 0 ; j < keys.length; j++){
          let option = document.createElement('option');
          option.setAttribute('value',keys[j]);
          option.textContent = `${keys[j]} - ${ap_list.aps[keys[j]].count}`;
          select.appendChild(option);
        }
        select.selectedIndex = 0;
      }

    })
    .catch((error) => console.error(error));
  }

  //----------------------------------------------------------------

  async function updateStatus(ip){

    console.log('updateStatus - targetList', targetList);

    const index = targetList.findIndex(item => item.ip === ip);
    console.log(`index of ${ip} in targetList = ${index}`);

    const target = targetList[index];

    for(let i = 0; i < target.state.audio_channels; i++){
      await updateInterfaceSection(ip, i);
    }

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
      document.getElementById(`${ip}-title`).textContent = `${target.state.hostname} (${ip})`;;

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

    // gather the elements we want to change
    const monitorModeToggle = document.getElementById(`${ip}-monitor-toggle-${index}`);
    const channelRange = document.getElementById(`${ip}-channel-range-${index}`);
    const channelIntervalRange = document.getElementById(`${ip}-channel-interval-range-${index}`);
    const channelIntervalToggle = document.getElementById(`${ip}-channel-interval-toggle-${index}`);
    const channelIndicator = document.getElementById(`${ip}-channel-${index}`);
    const rogueAPToggle = document.getElementById(`${ip}-ap-toggle-${index}`);
    const rogueAPSelect = document.getElementById(`${ip}-ssid-select-${index}`);

    // if there's no wifi_info, the interface has no wifi_capabilities. disable everything
    if (socket_state.wifi_info === null){
      monitorModeToggle.disabled = true;
      channelRange.disabled = true;
      channelIntervalRange.disabled = true;
      channelIntervalToggle.disabled = true;
      channelIndicator.textContent='-';
      rogueAPToggle.disabled = true;
      rogueAPSelect.disabled = true;
    } else {
      // selectively enable based on capabilities in wifi_info
      let is_monitor_capable = new Set(socket_state.wifi_info.modes).has('monitor')
      monitorModeToggle.disabled = ! is_monitor_capable;
      monitorModeToggle.checked = socket_state.wifi_info.current_mode === "monitor";
      channelRange.disabled =  ! is_monitor_capable;
      channelRange.value = parseInt(socket_state.wifi_info.current_channel);
      channelIndicator.textContent = socket_state.wifi_info.current_channel;
      channelIntervalRange.disabled = false;
      channelIntervalToggle.disabled = false;
      rogueAPToggle.disabled = ! new Set(socket_state.wifi_info.modes).has('AP') || socket_state.interface.match('^wlan[0-9]') != null;
      rogueAPToggle.checked = socket_state.wifi_info.current_mode === "master";
      rogueAPSelect.disabled = socket_state.wifi_info.current_mode === "master";
    }
  }

  //----------------------------------------------------------------

  function rangeGenerator(name, params, id, event_type, callback, index){
    var mainRow = row.cloneNode();
      var label = rangeLabel.cloneNode();
      label.setAttribute('for', `${id}-${name}-range-${ index || 'main'}`);
      label.textContent = name;

    mainRow.appendChild(label);

      var rangeGUI = range.cloneNode();
      rangeGUI.setAttribute('min', params.min);
      rangeGUI.setAttribute('max', params.max);
      rangeGUI.setAttribute('step', params.step);
      rangeGUI.setAttribute('value', params.value);
      rangeGUI.setAttribute('id',`${id}-${name}-range-${ index || 'main'}`);
      rangeGUI.addEventListener(event_type, callback);

    mainRow.appendChild(rangeGUI);

      var indicator = rangeValue.cloneNode();
      indicator.setAttribute('id',`${id}-${name}-${index}`);
      indicator.textContent = params.value;

    mainRow.appendChild(indicator);

    return mainRow;
  }

  //----------------------------------------------------------------

  function createWifiRows(target){
    console.log("target", target);
    var interfaceDivs = [];

    for(let i = 0; i < target.state.audio_channels; i++){
      var socket = target.state.sockets.sockets[i];

      var interfaceDiv = document.createElement('div');
        var interfaceRow = row.cloneNode();

          var interfaceNameCol = document.createElement('div');
          interfaceNameCol.setAttribute('class','col-4 text-truncate')
          interfaceNameCol.textContent = `Socket ${i+1} interface:`;
        interfaceRow.appendChild(interfaceNameCol);

          var interfaceSelectCol = document.createElement('div');
          interfaceSelectCol.setAttribute('class','col')
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

          interfaceSelectCol.appendChild(interfaceSelect);
        interfaceRow.appendChild(interfaceSelectCol);
      interfaceDiv.appendChild(interfaceRow);

        var wifiRow = row.cloneNode();
          var wifiMonitorCol = document.createElement('div');
          wifiMonitorCol.setAttribute('class','col-3 d-flex justify-content-center');
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
              wifiMonitorToggleLabel.textContent=`monitor`;
            wifiMonitorToggleDiv.appendChild(wifiMonitorToggle);
            wifiMonitorToggleDiv.appendChild(wifiMonitorToggleLabel);
          wifiMonitorCol.appendChild(wifiMonitorToggleDiv);
        wifiRow.appendChild(wifiMonitorCol);

          var wifiChannelCol = document.createElement('div');
          wifiChannelCol.setAttribute('class','col');
            var wifiChannelRange = rangeGenerator(
              "channel",
              {
                'min':'1',
                'max': '14',
                'step': '1',
                'value': '1'
              },
              target.ip,
              'input',
              async (e) => {
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
              },
              i.toString()
            );
          wifiChannelCol.appendChild(wifiChannelRange);
        wifiRow.appendChild(wifiChannelCol);
      interfaceDiv.appendChild(wifiRow);

        var wifiIntervalRow = row.cloneNode();
          var wifiIntervalRangeCol = document.createElement('div');
          wifiIntervalRangeCol.setAttribute('class', 'col');
            var wifiIntervalRangeRow = rangeRow.cloneNode();
              var wifiIntervalRangeLabel = rangeLabel.cloneNode();
              wifiIntervalRangeLabel.setAttribute('for',`${target.ip}-channel-interval-range-${i}`);
              wifiIntervalRangeLabel.textContent='interval';
            wifiIntervalRangeRow.appendChild(wifiIntervalRangeLabel);
              var wifiIntervalRange = range.cloneNode();
              wifiIntervalRange.setAttribute('min','25');
              wifiIntervalRange.setAttribute('max','2500');
              wifiIntervalRange.setAttribute('step','1');
              wifiIntervalRange.setAttribute('value','1000');
              wifiIntervalRange.setAttribute('id',`${target.ip}-channel-interval-range-${i}`);
              wifiIntervalRange.addEventListener('input', async (e) => {
                document.getElementById(`${target.ip}-channel-interval-${i}`).textContent = e.target.value;
              });
            wifiIntervalRangeRow.appendChild(wifiIntervalRange);
              var wifiIntervalIndicator = rangeValue.cloneNode()
              wifiIntervalIndicator.setAttribute('id',`${target.ip}-channel-interval-${i}`);
              wifiIntervalIndicator.textContent = '1000';
            wifiIntervalRangeRow.appendChild(wifiIntervalIndicator);
          wifiIntervalRangeCol.appendChild(wifiIntervalRangeRow);
        wifiIntervalRow.appendChild(wifiIntervalRangeCol);

          var wifiIntervalToggleCol = document.createElement('div');
          wifiIntervalToggleCol.setAttribute('class', 'col-3 d-flex justify-content-center')
            var wifiIntervalToggleDiv = formToggleDiv.cloneNode();
              var wifiIntervalToggle = toggle.cloneNode();
              wifiIntervalToggle.setAttribute('id',`${target.ip}-channel-interval-toggle-${i}`);
              wifiIntervalToggle.addEventListener('change', e => {
                if (e.target.checked) channelInterval(target.ip, i);
              });
              var wifiIntervalToggleLabel = formCheckLabel.cloneNode();
              wifiIntervalToggleLabel.setAttribute('for',`${target.ip}-channel-interval-toggle-${i}`);
              wifiIntervalToggleLabel.textContent='repeat';
            wifiIntervalToggleDiv.appendChild(wifiIntervalToggle);
            wifiIntervalToggleDiv.appendChild(wifiIntervalToggleLabel);
          wifiIntervalToggleCol.appendChild(wifiIntervalToggleDiv);
        wifiIntervalRow.appendChild(wifiIntervalToggleCol);
      interfaceDiv.appendChild(wifiIntervalRow);

        //----------------------------------------------------------------
        // Section for setting up Rogue APs

        var rogueAPRow = row.cloneNode();
          var rogueAPSSIDCol = document.createElement('div');
          rogueAPSSIDCol.setAttribute('class','col-1');
            var rogueAPSSIDButton = button.cloneNode();
            rogueAPSSIDButton.setAttribute('id',`${target.ip}-ssid-button`);
            rogueAPSSIDButton.textContent='+';
            rogueAPSSIDButton.addEventListener('click', async (e) =>{
              await updateAPSelect(target.ip);
            });
          rogueAPSSIDCol.appendChild(rogueAPSSIDButton);
          var rogueAPSelectCol = document.createElement('div');
          rogueAPSelectCol.setAttribute('class','col');
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
              document.getElementById(`${target.ip}-ssid-select-${i}`).disabled = e.target.checked;
              var intervalToggle = document.getElementById(`${target.ip}-channel-interval-toggle-${i}`);
              document.getElementById(`${target.ip}-channel-interval-range-${i}`).disabled = e.target.checked;
              intervalToggle.checked = false;
              intervalToggle.disabled = e.target.checked;
              intervalToggle.dispatchEvent(new Event('change'));

              const ap = apLists[target.ip].aps[ssid];

              var command = null; 
              var mac_address = 'mac_addresses' in ap && ap['mac_addresses'] ? ap['mac_addresses'][0] : null;
              var password = 'password' in ap ? ap['password'] : null;
              var ip_address = 'ip_address' in ap ? ap['ip_address'] : null;

              if(e.target.checked){
                command = {
                  'command' : 'start_ap',
                  'parameters' : {
                    "target" : target.ip,
                    'interface': null || selectedInterfaces[target.ip][`socket${i}`],
                    "ssid": ssid,
                    "ip_address": ip_address || `10.10.${i+1}0.1`,
                    "password": password,
                    "mac_address": mac_address,
                    'channel' : parseInt(document.getElementById(`${target.ip}-channel-range-${i}`).value)
                  }
                }
              } else {
                command = {
                  'command' : 'stop_ap',
                  'parameters' : {
                    "target" : target.ip,
                    'interface' : null || selectedInterfaces[target.ip][`socket${i}`],
                    'monitor' : document.getElementById(`${target.ip}-monitor-toggle-${i}`).checked,
                    'channel' : parseInt(document.getElementById(`${target.ip}-channel-range-${i}`).value)
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
    return interfaceDivs;
  }

  //================================================================

  function createPanel(target){

    //----------------------------------------------------------------
    //Construction

    // Main Panel
    var panel = document.createElement('div');
    panel.setAttribute('class','col border border-1 rounded p-3');
    panel.setAttribute('id',`${target.ip}`);

      // Title is basically just the IP of the target
      var titleRow = row.cloneNode();
        var titleCol = document.createElement('div');
          // var title = document.createElement('p');
          titleCol.setAttribute('class','col text-center h4');
          titleCol.setAttribute('id',`${target.ip}-title`);
        // titleCol.appendChild(title);
      titleRow.appendChild(titleCol);
        var refreshButtonCol = document.createElement('div');
        refreshButtonCol.setAttribute('class', 'col-3');
          var refreshButton = button.cloneNode();
          refreshButton.setAttribute('id',`${target.ip}-refresh-button`);
          refreshButton.textContent ='refresh';
          refreshButton.addEventListener('click', async (e) => {
            await updateStatus(target.ip);
            await updateAPSelect(target.ip);
          });
        refreshButtonCol.appendChild(refreshButton);
      titleRow.appendChild(refreshButtonCol);

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
        var messageIntervalRangeCol = document.createElement('div');
          messageIntervalRangeCol.setAttribute('class', 'col');

          var messageIntervalRangeRow = rangeRow.cloneNode();

            var messageIntervalRangeLabel = rangeLabel.cloneNode();
            messageIntervalRangeLabel.setAttribute('for',`${target.ip}-message-interval-range`);
            messageIntervalRangeLabel.textContent='interval';
          messageIntervalRangeRow.appendChild(messageIntervalRangeLabel);

            var messageIntervalRange = range.cloneNode();
            messageIntervalRange.setAttribute('min','25');
            messageIntervalRange.setAttribute('max','2500');
            messageIntervalRange.setAttribute('step','1');
            messageIntervalRange.setAttribute('value','1000');
            messageIntervalRange.setAttribute('id',`${target.ip}-message-interval-range`);
            messageIntervalRange.addEventListener('input', e => {
              document.getElementById(`${target.ip}-message-interval`).textContent = e.target.value;
            });
          messageIntervalRangeRow.appendChild(messageIntervalRange);

            var messageIntervalIndicator = rangeValue.cloneNode();
            messageIntervalIndicator.setAttribute('id',`${target.ip}-message-interval`);
            messageIntervalIndicator.textContent='1000';
          messageIntervalRangeRow.appendChild(messageIntervalIndicator);
        messageIntervalRangeCol.appendChild(messageIntervalRangeRow);
      messageIntervalRow.appendChild(messageIntervalRangeCol);

        var messageIntervalToggleCol = document.createElement('div');
          messageIntervalToggleCol.setAttribute('class', 'col-3 d-flex justify-content-center');
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
      messageIntervalRow.appendChild(messageIntervalToggleCol);

      var floodRow = row.cloneNode();
        var floodDelayCol = col.cloneNode();
          var floodDelayRow = rangeRow.cloneNode();
            var floodDelayRangeLabel = rangeLabel.cloneNode();
            floodDelayRangeLabel.setAttribute('for',`${target.ip}-message-flood-delay-range`);
            floodDelayRangeLabel.textContent='delay';
          floodDelayRow.appendChild(floodDelayRangeLabel);
            var floodDelayRange = range.cloneNode();
            floodDelayRange.setAttribute('min','0.0');
            floodDelayRange.setAttribute('max','1.0');
            floodDelayRange.setAttribute('step','0.001');
            floodDelayRange.setAttribute('value','0.500');
            floodDelayRange.setAttribute('id',`${target.ip}-message-flood-delay-range`);
            floodDelayRange.addEventListener('input', e => {
              document.getElementById(`${target.ip}-message-flood-delay`).textContent = parseFloat(e.target.value).toFixed(3);
            });
          floodDelayRow.appendChild(floodDelayRange);
            var floodDelayIndicator = rangeValue.cloneNode();
            floodDelayIndicator.setAttribute('id',`${target.ip}-message-flood-delay`);
            floodDelayIndicator.textContent='0.500';
          floodDelayRow.appendChild(floodDelayIndicator);
        floodDelayCol.appendChild(floodDelayRow);
      floodRow.appendChild(floodDelayCol);

        var floodCountCol = col.cloneNode();
          var floodCountRow = rangeRow.cloneNode();
            var floodCountRangeLabel = rangeLabel.cloneNode();
            floodCountRangeLabel.setAttribute('for',`${target.ip}-message-flood-count-range`);
            floodCountRangeLabel.textContent='count';
          floodCountRow.appendChild(floodCountRangeLabel);

            var floodCountRange = range.cloneNode();
            floodCountRange.setAttribute('min','1');
            floodCountRange.setAttribute('max','100');
            floodCountRange.setAttribute('step','1');
            floodCountRange.setAttribute('value','5');
            floodCountRange.setAttribute('id',`${target.ip}-message-flood-count-range`);
            floodCountRange.addEventListener('input', e => {
              document.getElementById(`${target.ip}-message-flood-count`).textContent = e.target.value;
            });
          floodCountRow.appendChild(floodCountRange);

            var floodCountIndicator = rangeValue.cloneNode();
            floodCountIndicator.setAttribute('id',`${target.ip}-message-flood-count`);
            floodCountIndicator.textContent='5';
          floodCountRow.appendChild(floodCountIndicator);
        floodCountCol.appendChild(floodCountRow);
      floodRow.appendChild(floodCountCol);

      var floodSendRow = row.cloneNode();
        var floodSendCol = col.cloneNode();
          var floodSendButton = button.cloneNode();
          floodSendButton.setAttribute('id',`${target.ip}-message-flood-button`);
          floodSendButton.textContent='flood';
          floodSendButton.addEventListener('click', e => {
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
            fetch('run', {
              method: "POST",
              body: JSON.stringify(command)
            });
          });
        floodSendCol.appendChild(floodSendButton);
      floodSendRow.appendChild(floodSendCol);

      var toneShapeRow = row.cloneNode();
        var randomShapeCol = document.createElement('div');
        randomShapeCol.setAttribute('class','col-2 text-truncate');
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
        shapeSelectCol.setAttribute('class','col');
          var shapeSelect = select.cloneNode();
          shapeSelect.setAttribute('id',`${target.ip}-shape-select`);
            var options = ['sine', 'tri', 'square', 'random', 'noise'];
            for(var i = 0; i < options.length; i++){
              var option = document.createElement('option');
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
        freqRandCol.setAttribute('class','col-2 text-truncate');
          var freqRandToggleDiv = formCheckDiv.cloneNode();
            var freqRandToggle = toggle.cloneNode();
            freqRandToggle.setAttribute('id',`${target.ip}-frequency-random-toggle`);
            var freqRandToggleLabel = formCheckLabel.cloneNode();
            freqRandToggleLabel.setAttribute('for',`${target.ip}-frequency-random-toggle`);
            freqRandToggleLabel.textContent=`rand`;
          freqRandToggleDiv.appendChild(freqRandToggle);
          freqRandToggleDiv.appendChild(freqRandToggleLabel);
        freqRandCol.appendChild(freqRandToggleDiv);
      toneParamsRow.appendChild(freqRandCol);

        var freqRangeCol = col.cloneNode();
          var freqRangeRow = rangeRow.cloneNode();
            var freqRange = range.cloneNode();
            freqRange.setAttribute('min','10');
            freqRange.setAttribute('max','10000');
            freqRange.setAttribute('step','0.1');
            freqRange.setAttribute('value','1000');
            freqRange.setAttribute('id',`${target.ip}-frequency-range`);
            freqRange.addEventListener('input', e => {
              document.getElementById(`${target.ip}-frequency`).value = e.target.value;
            });
          freqRangeRow.appendChild(freqRange);
            var freqRangeLabel = rangeLabel.cloneNode();
            freqRangeLabel.setAttribute('for',`${target.ip}-freq-range`);
            freqRangeLabel.textContent='freq';
          freqRangeRow.appendChild(freqRangeLabel);
        freqRangeCol.appendChild(freqRangeRow);
      toneParamsRow.appendChild(freqRangeCol);

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
      toneParamsRow.appendChild(freqNumberCol);

      //Tone Duration Row
      var durationRow = row.cloneNode();
        var durationRandCol = document.createElement('div');
        durationRandCol.setAttribute('class','col-2 text-truncate');
          var durationRandToggleDiv = formCheckDiv.cloneNode();
            var durationRandToggle = toggle.cloneNode();
            durationRandToggle.setAttribute('id',`${target.ip}-duration-random-toggle`);
            var durationRandToggleLabel = formCheckLabel.cloneNode();
            durationRandToggleLabel.setAttribute('for',`${target.ip}-duration-random-toggle`);
            durationRandToggleLabel.textContent=`rand`;
          durationRandToggleDiv.appendChild(durationRandToggle);
          durationRandToggleDiv.appendChild(durationRandToggleLabel);
        durationRandCol.appendChild(durationRandToggleDiv);
      durationRow.appendChild(durationRandCol);

        var durationRangeCol = col.cloneNode();
          var durationRangeRow = rangeRow.cloneNode();
            var durationRange = range.cloneNode();
            durationRange.setAttribute('min','2');
            durationRange.setAttribute('max','1400');
            durationRange.setAttribute('step','1');
            durationRange.setAttribute('value','500');
            durationRange.setAttribute('id',`${target.ip}-duration-range`);
            durationRange.addEventListener('input', e => {
              document.getElementById(`${target.ip}-duration`).value=e.target.value;
            });
          durationRangeRow.appendChild(durationRange);
            var durationRangeLabel = rangeLabel.cloneNode();
            durationRangeLabel.setAttribute('for',`${target.ip}-duration-range`);
            durationRangeLabel.textContent='duration';
          durationRangeRow.appendChild(durationRangeLabel);
        durationRangeCol.appendChild(durationRangeRow);
      durationRow.appendChild(durationRangeCol);

        var durationNumberCol = document.createElement('div');
        durationNumberCol.setAttribute('class','col-3');
          var durationNumber = document.createElement('input');
          durationNumber.setAttribute('class','form-control');
          durationNumber.setAttribute('type','number');
          durationNumber.setAttribute('min','2');
          durationNumber.setAttribute('max','1400');
          durationNumber.setAttribute('value','500');
          durationNumber.setAttribute('id',`${target.ip}-duration`);
          durationNumber.addEventListener('change', e => {
            document.getElementById(`${target.ip}-duration-range`).value = e.target.value;
          });
        durationNumberCol.appendChild(durationNumber);
      durationRow.appendChild(durationNumberCol);

      //Tone Interval Row
      var toneIntervalRow = row.cloneNode();
        var randomToneIntervalCol = document.createElement('div');
        randomToneIntervalCol.setAttribute('class','col-2');
          var randomToneIntervalToggleDiv = formCheckDiv.cloneNode();
            var randomToneIntervalToggle = toggle.cloneNode();
            randomToneIntervalToggle.setAttribute('id',`${target.ip}-interval-random-toggle`);
            var randomToneIntervalToggleLabel = formCheckLabel.cloneNode();
            randomToneIntervalToggleLabel.setAttribute('for',`${target.ip}-interval-random-toggle`);
            randomToneIntervalToggleLabel.textContent=`rand`;
          randomToneIntervalToggleDiv.appendChild(randomToneIntervalToggle);
          randomToneIntervalToggleDiv.appendChild(randomToneIntervalToggleLabel);
        randomToneIntervalCol.appendChild(randomToneIntervalToggleDiv);
      toneIntervalRow.appendChild(randomToneIntervalCol);

        var toneIntervalRangeCol = col.cloneNode();
          var toneIntervalRangeRow = rangeRow.cloneNode();
            var toneIntervalRangeLabel = rangeLabel.cloneNode();
            toneIntervalRangeLabel.setAttribute('for',`${target.ip}-tone-interval-range`);
            toneIntervalRangeLabel.textContent='interval';
          toneIntervalRangeRow.appendChild(toneIntervalRangeLabel);

            var toneIntervalRange = range.cloneNode();
            toneIntervalRange.setAttribute('min','50');
            toneIntervalRange.setAttribute('max','2500');
            toneIntervalRange.setAttribute('step','1');
            toneIntervalRange.setAttribute('value','1000');
            toneIntervalRange.setAttribute('id',`${target.ip}-tone-interval-range`);
            toneIntervalRange.addEventListener('input', e => {
              document.getElementById(`${target.ip}-tone-interval`).value = e.target.value;
            });
          toneIntervalRangeRow.appendChild(toneIntervalRange);
            var toneIntervalNumberCol = document.createElement('div');
            toneIntervalNumberCol.setAttribute('class','col-3');
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
          toneIntervalRangeRow.appendChild(toneIntervalNumberCol) 
        toneIntervalRangeCol.appendChild(toneIntervalRangeRow);
      toneIntervalRow.appendChild(toneIntervalRangeCol);

        var toneIntervalToggleCol = document.createElement('div');
        toneIntervalToggleCol.setAttribute('class','col-2');
          var toneIntervalToggleDiv = formToggleDiv.cloneNode();
            var toneIntervalToggle = toggle.cloneNode();
            toneIntervalToggle.setAttribute('id',`${target.ip}-tone-interval-toggle`);
            toneIntervalToggle.addEventListener('change', e => {
              if(e.target.checked){
                toneInterval(target.ip);
              }
            });
          toneIntervalToggleDiv.appendChild(toneIntervalToggle);
            var toneIntervalToggleLabel = formCheckLabel.cloneNode();
            toneIntervalToggleLabel.setAttribute('for',`${target.ip}-tone-interval-toggle`);
            toneIntervalToggleLabel.textContent='repeat';
          toneIntervalToggleDiv.appendChild(toneIntervalToggleLabel);
        toneIntervalToggleCol.appendChild(toneIntervalToggleDiv);
      toneIntervalRow.appendChild(toneIntervalToggleCol);

      //Beep Row
      var beepRow = row.cloneNode();
        var beepCol = col.cloneNode();
          var beepButton = button.cloneNode();
          beepButton.setAttribute('id',`${target.ip}-tone-button`);
          beepButton.textContent='beep';
          beepButton.addEventListener('click', e => {
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
            fetch('run', {
              method: "POST",
              body: JSON.stringify(command)
            });
          });
        beepCol.appendChild(beepButton);
      beepRow.appendChild(beepCol);

      //NMAP Scan Controls

      var scanRow = row.cloneNode();
        var scanModeCol = document.createElement('div');
        scanModeCol.setAttribute('class','col-3 d-flex justify-content-end');
          var scanModeSelect = select.cloneNode();
          scanModeSelect.setAttribute('id',`${target.ip}-scan-mode-select`);
            var options = ['-sS','-sT','-sA','-sX'];
            for(var i = 0; i < options.length; i++){
              var option = document.createElement('option');
              option.value = options[i];
              option.textContent = options[i];
              if(options[i]=='-sT'){
                option.selected=true;
              }
              scanModeSelect.appendChild(option);
            }
        scanModeCol.appendChild(scanModeSelect);
      scanRow.appendChild(scanModeCol);

        var scanOptionsCol = document.createElement('div');
        scanOptionsCol.setAttribute('class','col d-flex justify-content-center');
          var scanOptionsRow = document.createElement('div');
          scanOptionsRow.setAttribute('class', 'row align-items-center flex-nowrap');

            var scanOptionSyCol = document.createElement('div');
            scanOptionSyCol.setAttribute('class','col');
              var scanOptionSyToggle = toggle.cloneNode();
              scanOptionSyToggle.classList.add('m-1');
              scanOptionSyToggle.setAttribute('id',`${target.ip}-scan-option-sy`);
            scanOptionSyCol.appendChild(scanOptionSyToggle);
              var scanOptionSyLabel = formCheckLabel.cloneNode();
              scanOptionSyLabel.classList.add('m-1');
              scanOptionSyLabel.setAttribute('for',`${target.ip}-scan-option-sy`);
              scanOptionSyLabel.textContent = 'sY';
            scanOptionSyCol.appendChild(scanOptionSyLabel);
          scanOptionsRow.appendChild(scanOptionSyCol);

            var scanOptionSzCol = document.createElement('div');
            scanOptionSzCol.setAttribute('class','col');
              var scanOptionSzToggle = toggle.cloneNode();
              scanOptionSzToggle.classList.add('m-1');
              scanOptionSzToggle.setAttribute('id',`${target.ip}-scan-option-sz`);
            scanOptionSzCol.appendChild(scanOptionSzToggle);
              var scanOptionSzLabel = formCheckLabel.cloneNode();
              scanOptionSzLabel.classList.add('m-1');
              scanOptionSzLabel.setAttribute('for',`${target.ip}-scan-option-sz`);
              scanOptionSzLabel.textContent = 'sZ';
            scanOptionSzCol.appendChild(scanOptionSzLabel);
          scanOptionsRow.appendChild(scanOptionSzCol);

            var scanOptionScCol = document.createElement('div');
            scanOptionScCol.setAttribute('class','col');
              var scanOptionScToggle = toggle.cloneNode();
              scanOptionScToggle.classList.add('m-1');
              scanOptionScToggle.setAttribute('id',`${target.ip}-scan-option-sc`);
            scanOptionScCol.appendChild(scanOptionScToggle);
              var scanOptionScLabel = formCheckLabel.cloneNode();
              scanOptionScLabel.classList.add('m-1');
              scanOptionScLabel.setAttribute('for',`${target.ip}-scan-option-sc`);
              scanOptionScLabel.textContent = 'sC';
            scanOptionScCol.appendChild(scanOptionScLabel);
          scanOptionsRow.appendChild(scanOptionScCol);

            var scanOptionSvCol = document.createElement('div');
            scanOptionSvCol.setAttribute('class','col');
              var scanOptionSvToggle = toggle.cloneNode();
              scanOptionSvToggle.classList.add('m-1');
              scanOptionSvToggle.setAttribute('id',`${target.ip}-scan-option-sv`);
            scanOptionSvCol.appendChild(scanOptionSvToggle);
              var scanOptionSvLabel = formCheckLabel.cloneNode();
              scanOptionSvLabel.classList.add('m-1');
              scanOptionSvLabel.setAttribute('for',`${target.ip}-scan-option-sv`);
              scanOptionSvLabel.textContent = 'sV';
            scanOptionSvCol.appendChild(scanOptionSvLabel);
          scanOptionsRow.appendChild(scanOptionSvCol);

            var scanOptionOCol = document.createElement('div');
            scanOptionOCol.setAttribute('class','col');
              var scanOptionOToggle = toggle.cloneNode();
              scanOptionOToggle.classList.add('m-1');
              scanOptionOToggle.setAttribute('id',`${target.ip}-scan-option-o`);
            scanOptionOCol.appendChild(scanOptionOToggle);
              var scanOptionOLabel = formCheckLabel.cloneNode();
              scanOptionOLabel.classList.add('m-1');
              scanOptionOLabel.setAttribute('for',`${target.ip}-scan-option-o`);
              scanOptionOLabel.textContent = 'O';
            scanOptionOCol.appendChild(scanOptionOLabel);
          scanOptionsRow.appendChild(scanOptionOCol);
        scanOptionsCol.appendChild(scanOptionsRow);
      scanRow.appendChild(scanOptionsCol);

        var scanButtonCol = document.createElement('div');
        scanButtonCol.setAttribute('class','col-3 d-flex justify-content-center');
          var scanButton = button.cloneNode();
          scanButton.setAttribute('id',`${target.ip}-scan-button`);
          scanButton.textContent='scan';
          scanButton.addEventListener('click', e => {
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
            fetch('run', {
              method: "POST",
              body: JSON.stringify(command)
            });
          });
        scanButtonCol.appendChild(scanButton);
      scanRow.appendChild(scanButtonCol);

    panel.appendChild(titleRow);
    panel.appendChild(writerDiv);
    panel.appendChild(hr.cloneNode());
    interfaceDivs.forEach(interfaceDiv => panel.appendChild(interfaceDiv));
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

  function channelInterval(id, index){
    if(document.getElementById(`${id}-channel-interval-toggle-${index}`).checked){
      var interval = Math.round(document.getElementById(`${id}-channel-interval-range-${index}`).value);
      var range = document.getElementById(`${id}-channel-range-${index}`);
      range.value = Math.round(13*Math.random());
      range.dispatchEvent(new Event('input'));
      setTimeout(channelInterval, interval, id, index);
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
        range.value = Math.round(randomRange(2,1400));
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
        try{
          targetList = null;
          var textContent = e.target.textContent;
          e.target.textContent = 'working';
          e.target.disabled = true;
          const network = document.getElementById('networks-select').value;

          if(!network) return;
          
          var parent = document.getElementById('target-panels');
          targetList = await networkScan(network);
          
          if (!targetList || targetList.length == 0){
            parent.hidden = true;
          } else {

            while (parent.hasChildNodes()){
              parent.firstChild.remove();
            }

            console.log('targetList',targetList)
            targetList.sort((a, b) => {
              const nameA = a.state.hostname; // ignore upper and lowercase
              const nameB = b.state.hostname; // ignore upper and lowercase
              if (nameA < nameB) {
                return -1;
              }
              
              if (nameA > nameB) {
                return 1;
              }
              return 0;
            });

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
              await updateAPSelect(targetList[i].ip);
            }
            parent.hidden = false;
          }
          
        } catch (error) {
          console.error(error);
        } finally {
          e.target.textContent = textContent;
          e.target.disabled = false;
        }
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
            "command" : "nping_icmp_oneshot",
            "parameters" : {
              "target" : targetList[i].ip,
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
            "command" : "nping_icmp_flood",
            "parameters" : {
              "target" : targetList[i].ip,
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
            "command" : "tone",
            "parameters" : {
              "target" : targetList[i].ip,
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
            "command" : "scan",
            "parameters" : {
              "target" : targetList[i].ip,
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

