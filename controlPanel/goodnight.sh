#!/bin/bash

for i in {1..3};do
	sudo nping --icmp 10.42.0.12$i -c 10 --delay 0.001 --data-string '<<< THANK YOU >>> <<< NOT.GLI.TC/H 2023 >>> <<< THANK YOU >>> <<< NOT.GLI.TC/H 2023 >>> <<< THANK YOU >>> <<< NOT.GLI.TC/H 2023 >>> <<< THANK YOU >>> <<< NOT.GLI.TC/H 2023 >>> <<< THANK YOU >>> <<< NOT.GLI.TC/H 2023 >>> <<< THANK YOU >>> <<< NOT.GLI.TC/H 2023 >>> <<< THANK YOU >>> <<< NOT.GLI.TC/H 2023 >>> <<< THANK YOU >>> <<< NOT.GLI.TC/H 2023 >>> <<< THANK YOU >>> <<< NOT.GLI.TC/H 2023 >>> <<< THANK YOU >>> <<< NOT.GLI.TC/H 2023 >>> <<< THANK YOU >>> <<< NOT.GLI.TC/H 2023 >>> <<< THANK YOU >>> <<< NOT.GLI.TC/H 2023 >>> <<< THANK YOU >>> <<< NOT.GLI.TC/H 2023 >>> <<< THANK YOU >>> <<< NOT.GLI.TC/H 2023 >>> <<< THANK YOU >>> <<< NOT.GLI.TC/H 2023 >>> <<< THANK YOU >>> <<< NOT.GLI.TC/H 2023 >>> <<< THANK YOU >>> <<< NOT.GLI.TC/H 2023 >>> <<< THANK YOU >>> <<< NOT.GLI.TC/H 2023 >>> <<< THANK YOU >>> <<< NOT.GLI.TC/H 2023 >>> '
done

sleep 5

for i in {1..3};do
	ssh 10.42.0.12$i 'sudo pkill -9 -t tty1 && sudo shutdown -h now'
done