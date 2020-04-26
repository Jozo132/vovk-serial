// @ts-check
'use strict'

const SerialConnection = require('./main')

const mySerial = new SerialConnection

setInterval(() => {
    console.log(mySerial.list())
}, 1000)