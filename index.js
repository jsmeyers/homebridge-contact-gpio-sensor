var Service;
var Characteristic;
var HomebridgeAPI;
var Gpio = require('onoff').Gpio
var contactSensor;


module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    HomebridgeAPI = homebridge;

    // console.log(Service.ContactSensor);
    homebridge.registerAccessory("homebridge-contact-gpio-sensor", "ContactGPIOSensor", ContactGPIOSensor);
}

function ContactGPIOSensor(log, config) {
	this.log = log;
	this.name = config.name;
	this.pinId = config.pinId;
	contactSensor = new Gpio(this.pinId, 'in', 'both');

	this.service = new Service.ContactSensor(this.name);

	this.service.getCharacteristic(Characteristic.ContactSensorState)
		.on('get', this.getState.bind(this));

}

ContactGPIOSensor.prototype.getState = function(callback) {
	var val;
	for (var i = 0; i < 10; i++) {
		val = contactSensor.readSync();
		if (val == 1) {
			break;
		}
	}
	if (val == 1) {
		val = 0;
	} else if (val == 0) {
		val = 1;
	}
	callback(null, val);
}

ContactGPIOSensor.prototype.getServices = function() {
  return [this.service];
}