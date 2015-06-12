#! /bin/bash
clear
echo "testing VWire API"

URL="http://localhost:9997/api/2.0/vdn/scopes/vdnscope-1/internal/virtualwires"
FILENAME=body.txt

curl --user admin:default -X POST -d @$FILENAME $URL -H "Content-Type: application/xml" -H  "Accept: application/xml" --insecure





