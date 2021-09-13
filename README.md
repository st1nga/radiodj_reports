Reports

Here is a simple way to run the report sever as a service
```
[Unit]
Description=RadioDJ report server radiodj_reports
After=network-online.target

[Service]
Type=simple

WorkingDirectory=/home/coastfm/radiodj_reports
ExecStart=/usr/bin/node reports --log-level=info
Restart=always
RestartSec=5
StartLimitInterval=0

[Install]
WantedBy=multi-user.target
```
