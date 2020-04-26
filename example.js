const mySerial = new (require('./main.js'))



setInterval(() => {
    console.log(mySerial.list())
}, 1000)