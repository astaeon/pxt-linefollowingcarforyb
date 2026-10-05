
namespace 循跡車 {
    let IR_MID_PIN = DigitalPin.P1
    let IR_LEFT_PIN = DigitalPin.P4
    let IR_RIGHT_PIN = DigitalPin.P10
    let LeftSpeed = 0
    let RightSpeed = 0
    let StraightLineSpeed = 150
    let IrMidIsBlack = false
    let IrLeftIsBlack = false
    let IrRightIsBlack = false

    //% block="中間有黑線"
    export function 中間有黑線(): boolean {
        return (IrMidIsBlack == true)
    }
    //% block="左邊有黑線"
    export function 左邊有黑線(): boolean {
        return (IrLeftIsBlack == true)
    }
    //% block="右邊有黑線"
    export function 右邊有黑線(): boolean {
        return (IrRightIsBlack == true)
    }

    //% block="中間沒黑線"
    export function 中間沒黑線(): boolean {
        return (IrMidIsBlack == false)
    }
    //% block="左邊沒黑線"
    export function 左邊沒黑線(): boolean {
        return (IrLeftIsBlack == false)
    }
    //% block="右邊沒黑線"
    export function 右邊沒黑線(): boolean {
        return (IrRightIsBlack == false)
    }

    //% block="啟用循跡車"
    export function 啟用循跡車() {
        led.enable(false)
        pins.setPull(IR_MID_PIN, PinPullMode.PullNone)
        pins.setPull(IR_LEFT_PIN, PinPullMode.PullNone)
        pins.setPull(IR_RIGHT_PIN, PinPullMode.PullNone)
    }
    //% block="更新感測值"
    export function 更新感測值() {
        IrMidIsBlack = (pins.digitalReadPin(IR_MID_PIN) == 1) ? true : false
        IrLeftIsBlack = (pins.digitalReadPin(IR_LEFT_PIN) == 1) ? true : false
        IrRightIsBlack = (pins.digitalReadPin(IR_RIGHT_PIN) == 1) ? true : false
    }
    //% block="直行"
    export function 直行() {
        LeftSpeed = StraightLineSpeed
        RightSpeed = StraightLineSpeed
    }
    //% block="往左微調"
    export function 往左微調() {
        LeftSpeed = StraightLineSpeed - 30
        RightSpeed = StraightLineSpeed + 30
    }
    //% block="往右微調"
    export function 往右微調() {
        LeftSpeed = StraightLineSpeed + 30
        RightSpeed = StraightLineSpeed - 30
    }
    //% block="往左修正"
    export function 往左修正() {
        LeftSpeed = StraightLineSpeed - 100
        RightSpeed = StraightLineSpeed + 100
    }
    //% block="往右修正"
    export function 往右修正() {
        LeftSpeed = StraightLineSpeed + 90
        RightSpeed = StraightLineSpeed - 90
    }
    //% block="馬達控制"
    export function 馬達控制() {
        YbExtend.MotorRun(YbExtend.enMotors.M1, LeftSpeed);
        YbExtend.MotorRun(YbExtend.enMotors.M3, RightSpeed);
    }
}

namespace YbExtend {

    const PCA9685_ADD = 0x40
    const MODE1 = 0x00
    const PRESCALE = 0xFE
    let initialized = false

    export enum enMotors {
        M1 = 8,
        M2 = 10,
        M3 = 12,
        M4 = 14
    }

    function i2cwrite(addr: number, reg: number, value: number) {
        let buf = pins.createBuffer(2)
        buf[0] = reg
        buf[1] = value
        pins.i2cWriteBuffer(addr, buf)
    }
    function i2cread(addr: number, reg: number) {
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE);
        let val = pins.i2cReadNumber(addr, NumberFormat.UInt8BE);
        return val;
    }
    function initPCA9685(): void {
        i2cwrite(PCA9685_ADD, MODE1, 0x00)
        setFreq(50);
        initialized = true
    }

    function setFreq(freq: number): void {
        // Constrain the frequency
        let prescaleval = 25000000;
        prescaleval /= 4096;
        prescaleval /= freq;
        prescaleval -= 1;
        let prescale = prescaleval; //Math.Floor(prescaleval + 0.5);
        let oldmode = i2cread(PCA9685_ADD, MODE1);
        let newmode = (oldmode & 0x7F) | 0x10; // sleep
        i2cwrite(PCA9685_ADD, MODE1, newmode); // go to sleep
        i2cwrite(PCA9685_ADD, PRESCALE, prescale); // set the prescaler
        i2cwrite(PCA9685_ADD, MODE1, oldmode);
        control.waitMicros(5000);
        i2cwrite(PCA9685_ADD, MODE1, oldmode | 0xa1);
    }

    function setPwm(channel: number, on: number, off: number): void {
        if (channel < 0 || channel > 15)
            return;
        if (!initialized) {
            initPCA9685();
        }
        let buf2 = pins.createBuffer(5);
        buf2[0] = 0x06 + 4 * channel;
        buf2[1] = on & 0xff;
        buf2[2] = (on >> 8) & 0xff;
        buf2[3] = off & 0xff;
        buf2[4] = (off >> 8) & 0xff;
        pins.i2cWriteBuffer(PCA9685_ADD, buf2);
    }

    export function MotorRun(index: enMotors, speed: number): void {
        if (!initialized) {
            initPCA9685()
        }
        speed = speed * 16; // map 255 to 4096
        if (speed >= 4096) {
            speed = 4095
        }
        if (speed <= -4096) {
            speed = -4095
        }

        let a = index
        let b = index + 1

        if (a > 10) {
            if (speed >= 0) {
                setPwm(a, 0, speed)
                setPwm(b, 0, 0)
            } else {
                setPwm(a, 0, 0)
                setPwm(b, 0, -speed)
            }
        }
        else {
            if (speed >= 0) {
                setPwm(b, 0, speed)
                setPwm(a, 0, 0)
            } else {
                setPwm(b, 0, 0)
                setPwm(a, 0, -speed)
            }
        }
    }
}
