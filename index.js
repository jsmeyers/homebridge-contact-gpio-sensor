var Service;
var Characteristic;
var HomebridgeAPI;
var Gpio = require('onoff').Gpio;

var RETRY_COUNT = 10;

function translate(value) {
	var val;
	if (value === 1) {
		// circuit is closed
		val = Characteristic.ContactSensorState.CONTACT_DETECTED;
	} else if (value === 0) {
		// circuit is open
		val = Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
	}
	return val;
}


module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    HomebridgeAPI = homebridge;

    // console.log(Service.ContactSensor);
    homebridge.registerAccessory("homebridge-contact-gpio-sensor", "ContactGPIOSensor", ContactGPIOSensor);
};

function ContactGPIOSensor(log, config) {
	this.log = log;
	this.name = config.name;
	this.pinId = config.pinId;
	this.retryCount = config.retryCount || RETRY_COUNT;
	this.contactSensor = new Gpio(this.pinId, 'in', 'both');



	this.service = new Service.ContactSensor(this.name);

	this.service.getCharacteristic(Characteristic.ContactSensorState)
		.on('get', this.getState.bind(this));

	var that = this;
	this.contactSensor.watch(function(err, value) {
		that.service.getCharacteristic(Characteristic.ContactSensorState)
			.setValue(translate(value));
	});

	process.on('SIGINT', function () {
		that.contactSensor.unexport();
	});
}

ContactGPIOSensor.prototype.getState = function(callback) {
	var val;
	for (var i = 0; i < this.retryCount; i++) {
		val = this.contactSensor.readSync();
		if (val == 1) {
			break;
		}
	}
	val = translate(val);
	callback(null, val);
};

ContactGPIOSensor.prototype.getServices = function() {
  return [this.service];
};