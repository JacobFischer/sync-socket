# generates documentation via jsdoc

if [ ! -d ./node_modules/jaguarjs-jsdoc ]; then
    npm install https://github.com/JacobFischer/jaguarjs-jsdoc.git
fi

if [ ! -d ./node_modules/jsdoc ]; then
    npm install jsdoc
fi

cat > conf.json <<- EOM
{
    "templates": {
        "applicationName": "SyncSocket Documentation",
        "meta": {
            "title": "SyncSocket Documentation",
            "description": "Documentation for the SyncScoket Node.js module",
            "footer": "&copy; Jacob Fischer",
            "noSourceFiles": true
        }
    }
}
EOM

rm -rf out

./node_modules/.bin/jsdoc index.js -r ./README.md -t node_modules/jaguarjs-jsdoc -c conf.json

rm conf.json
