#!/bin/bash

echo 'Starting Application start process'

echo 'Application Start Script'


# starting all services
cd /home/ec2-user/baseapplication
sudo su root
sudo pm2 start app.js
sudo pm2 startup systemd
sudo pm2 save
sudo ln -sf /home/ec2-user/baseapplication/node-service.service /etc/systemd/system/node-service.service
sudo systemctl daemon-reload
sudo systemctl restart node-service.service