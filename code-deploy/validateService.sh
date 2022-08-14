#!/bin/bash

echo 'Starting Validation process'

echo 'Validate Service Script'

pm2 restart all --update-env
pm2 save
pm2 status
