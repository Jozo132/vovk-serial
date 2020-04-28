// @ts-check
'use strict'

const SerialConnection = require('./vovk-serial')

const Serial = new SerialConnection

let port = 'COM3'
let baud = 115200

// Try to connect to serial port. Will try to reconnect forever, even on connection lost or any error, until connected or Serial.end() is called
Serial.begin(port, baud)

// Triggered when connected or reconnected to device
Serial.onConnect(() => {
    console.log(`Serial ${Serial.port()}@${Serial.baudrate()} connected!`)
    Serial.println(`Hello World`) // Sends 'Hello World' to connected serial port when connection is established with carrier return and new line
})

// Triggered when disconnected from device
Serial.onDisconnect(() => {
    console.log(`Serial ${Serial.port()}@${Serial.baudrate()} disconnected!`)
})

// Triggered when error triggered from connecting to the device
Serial.onError(() => {
    console.log(`Serial ${Serial.port()}@${Serial.baudrate()} connection ERROR!`)
})


// Incoming data will always be collected here
Serial.onRead(packet => {
    console.log(`${Serial.port()}@${Serial.baudrate()} > read:  ${packet}`) // Display data received from serial for processing and/or debugging
    Serial.end() // End connection when one packet of data is received
})

// Outgoing data will always be collected here if needed
Serial.onWrite(packet => {
    console.log(`${Serial.port()}@${Serial.baudrate()} < write: ${packet}`) // Display data sent to serial port for debugging
})

const updateSerialStats = () => {
    const info = Serial.info()

    console.log(`Serial info:`)
    Object.keys(info).forEach(dataName => {
        const value = info[dataName]
        console.log(`\t${dataName}: ${value}`)
    })

    // Do something with the information, like live status display
}
setInterval(updateSerialStats, 5000)




