# // node Hash_Proxy.js https://en.wikipedia.org:443 wiki 9997


DIR=/Users/xingw/Project/main/simulation/proxy/test
if [ -d "$DIR" ]; then
    printf '%s\n' "Removing ($DIR) ..."
    rm -rf "$DIR"
fi
node Hash_Proxy.js https://10.33.121.243:9443/vsphere-client test 9997
