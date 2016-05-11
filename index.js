var Service;
var Characteristic;
var HomebridgeAPI;
var Gpio = require('onoff').Gpio;
var inherits = require('util').inherits;

var RETRY_COUNT = 10;

function translate(value) {
	var val;
	if (value === 1) {
		// circuit is closed
		val = Characteristic.CurrentDoorState.CLOSED;
	} else if (value === 0) {
		// circuit is open
		val = Characteristic.CurrentDoorState.OPEN;
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
	this.openedCounter = 0;


	EveTimesOpened = function () {
	    //todo: only rough guess of extreme values -> use correct min/max if known
	    Characteristic.call(this, 'Times Opened', 'E863F129-079E-48FF-8F27-9C2605A29F52');
	    this.setProps({
	        format: Characteristic.Formats.UINT8,
	        minValue: 0,
	        minStep: 1,
	        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
	    });
	    this.value = this.getDefaultValue();
	};
	inherits(EveTimesOpened, Characteristic);

	this.eve_characteristic_times_opened = EveTimesOpened;

	//Eve service (custom UUID)
	EveDoorService = function (displayName, subtype) {
	    Service.call(this, displayName, 'E863F003-079E-48FF-8F27-9C2605A29F52', subtype);
	    // Required Characteristics
	    this.addCharacteristic(Characteristic.CurrentDoorState);
	    // Optional Characteristics
	    this.addOptionalCharacteristic(EveTimesOpened);
	};
	inherits(EveDoorService, Service);


	this.eve_service = new EveDoorService(this.name);

	this.eve_service.getCharacteristic(Characteristic.CurrentDoorState)
		.on('get', this.getState.bind(this));

	this.eve_service.getCharacteristic(EveTimesOpened)
		.on('get', this.getOpenedCounter.bind(this));

	var that = this;
	this.contactSensor.watch(function(err, value) {
		that.openedCounter++;
		that.eve_service.getCharacteristic(that.eve_characteristic_times_opened)
			.setValue(Math.floor(that.openedCounter/2));
		that.eve_service.getCharacteristic(Characteristic.CurrentDoorState)
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

ContactGPIOSensor.prototype.getOpenedCounter = function(callback) {
	callback(null, Math.floor(this.openedCounter/2));
};

ContactGPIOSensor.prototype.getServices = function() {
  return [this.eve_service];
};