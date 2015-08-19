# // node Hash_Proxy.js https://en.wikipedia.org:443 wiki 9997


DIR=$1
if [ -d "$DIR" ]; then
    printf '%s\n' "Removing ($DIR) ..."
    rm -rf "$DIR"
fi
# node Hash_Proxy.js https://10.33.120.58:9443 test 9996 proxy.json
# node Hash_Proxy.js proxy.json
