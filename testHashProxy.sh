# node Proxy.js http://google.com google 9997

# node Proxy.js http://news.yahoo.com/ yahoo 9997

DIR=/Users/xingw/Project/main/simulation/proxy/localhost
if [ -d "$DIR" ]; then
    printf '%s\n' "Removing ($DIR) ..."
    rm -rf "$DIR"
fi
printf "Folder removed. Now start proxy...\n"
node Hash_Proxy.js http://localhost:8080 localhost 9997