//Code for the SpaceApps 2015 GoSat project.
//https://2015.spaceappschallenge.org/project/gosat/
//http://www.gosat.info
//AHRS code from Mini IMU AHRS Example code licensed under GNU Lesser General Public License
//GoSat is licensed under Academic Free License - 3.0 AFL-3.0 
//http://opensource.org/licenses/AFL-3.0

// Uncomment the below line to use this axis definition:
// X axis pointing forward
// Y axis pointing to the right
// and Z axis pointing down.
// Positive pitch : nose up
// Positive roll : right wing down
// Positive yaw : clockwise
int SENSOR_SIGN[9] = {1, 1, 1, -1, -1, -1, 1, 1, 1}; //Correct directions x,y,z - gyro, accelerometer, magnetometer
// Uncomment the below line to use this axis definition:
// X axis pointing forward
// Y axis pointing to the left
// and Z axis pointing up.
// Positive pitch : nose down
// Positive roll : right wing down
// Positive yaw : counterclockwise
//int SENSOR_SIGN[9] = {1,-1,-1,-1,1,1,1,-1,-1}; //Correct directions x,y,z - gyro, accelerometer, magnetometer

// tested with Arduino Uno with ATmega328 and Arduino Duemilanove with ATMega168
#include <Servo.h>
#include <Wire.h>

// LSM303 accelerometer: 8 g sensitivity
// 3.8 mg/digit; 1 g = 256
#define GRAVITY 256  //this equivalent to 1G in the raw data coming from the accelerometer 

#define ToRad(x) ((x)*0.01745329252)  // *pi/180
#define ToDeg(x) ((x)*57.2957795131)  // *180/pi

// L3G4200D gyro: 2000 dps full scale
// 70 mdps/digit; 1 dps = 0.07
#define Gyro_Gain_X 0.07 //X axis Gyro gain
#define Gyro_Gain_Y 0.07 //Y axis Gyro gain
#define Gyro_Gain_Z 0.07 //Z axis Gyro gain
#define Gyro_Scaled_X(x) ((x)*ToRad(Gyro_Gain_X)) //Return the scaled ADC raw data of the gyro in radians for second
#define Gyro_Scaled_Y(x) ((x)*ToRad(Gyro_Gain_Y)) //Return the scaled ADC raw data of the gyro in radians for second
#define Gyro_Scaled_Z(x) ((x)*ToRad(Gyro_Gain_Z)) //Return the scaled ADC raw data of the gyro in radians for second

// LSM303 magnetometer calibration constants; use the Calibrate example from
// the Pololu LSM303 library to find the right values for your board
#define M_X_MIN -421
#define M_Y_MIN -639
#define M_Z_MIN -238
#define M_X_MAX 424
#define M_Y_MAX 295
#define M_Z_MAX 472

#define Kp_ROLLPITCH 0.02
#define Ki_ROLLPITCH 0.00002
#define Kp_YAW 1.2
#define Ki_YAW 0.00002

/*For debugging purposes*/
//OUTPUTMODE=1 will print the corrected data,
//OUTPUTMODE=0 will print uncorrected data of the gyros (with drift)
#define OUTPUTMODE 1

//#define PRINT_DCM 0     //Will print the whole direction cosine matrix
#define PRINT_ANALOGS 0 //Will print the analog raw data
#define PRINT_EULER 1   //Will print the Euler angles Roll, Pitch and Yaw

#define STATUS_LED 47

float G_Dt = 0.02;  // Integration time (DCM algorithm)  We will run the integration loop at 50Hz if possible

long timer = 0; //general purpuse timer
long timer_old;
long timer24 = 0; //Second timer used to print values
int AN[6]; //array that stores the gyro and accelerometer data
int AN_OFFSET[6] = {0, 0, 0, 0, 0, 0}; //Array that stores the Offset of the sensors

int gyro_x;
int gyro_y;
int gyro_z;
int accel_x;
int accel_y;
int accel_z;
int magnetom_x;
int magnetom_y;
int magnetom_z;
float c_magnetom_x;
float c_magnetom_y;
float c_magnetom_z;
float MAG_Heading;

float Accel_Vector[3] = {0, 0, 0}; //Store the acceleration in a vector
float Gyro_Vector[3] = {0, 0, 0}; //Store the gyros turn rate in a vector
float Omega_Vector[3] = {0, 0, 0}; //Corrected Gyro_Vector data
float Omega_P[3] = {0, 0, 0}; //Omega Proportional correction
float Omega_I[3] = {0, 0, 0}; //Omega Integrator
float Omega[3] = {0, 0, 0};

// Euler angles
float roll;
float pitch;
float yaw;

float errorRollPitch[3] = {0, 0, 0};
float errorYaw[3] = {0, 0, 0};

unsigned int counter = 0;
byte gyro_sat = 0;

float DCM_Matrix[3][3] = {
  {
    1, 0, 0
  }
  , {
    0, 1, 0
  }
  , {
    0, 0, 1
  }
};
float Update_Matrix[3][3] = {{0, 1, 2}, {3, 4, 5}, {6, 7, 8}}; //Gyros here


float Temporary_Matrix[3][3] = {
  {
    0, 0, 0
  }
  , {
    0, 0, 0
  }
  , {
    0, 0, 0
  }
};
//GoSat constants:

const int sensT1 = A0, sensT2 = A1, sensL1 = A2, sensL2 = A3, sensL3 = A4, sensL4 = A5, sensV1 = A8, sensV2 = A9, sensV3 = A10;
const int LEDsM[8] = {22, 24, 26, 28, 30, 32, 34, 36};
const int LEDsACT[12] = {23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45}, redPin = 48, greenPin = 50;
const int pinServos[] = {8, 9, 10, 11, 12, 13};
const int zeroServos[]={90,90,90,90,90,90};
const int maxServos[]={175,5,175,5,90,90};
const int minServos[]={60,120,5,167,90,90};
const int refTlow = 320, refLlow = 900, refV1low = 620, refV2low = 650, refV3low = 630;
const int refThigh = 450, refLhigh = 0, refV1high = 920, refV2high = 930, refV3high = 880;
volatile float Temp1 = 0.0, Temp2 = 0.0, Bat1 = 0.0, Bat2 = 0.0, Bat3 = 0.0, LuzR = 0.0, LuzL = 0.0, LuzA = 0.0;
boolean continuous = false;
volatile char charPanels='0', charMotor='0', charGreen='0', charRed='0';
bool desplegado=false,motor=false,green=false,red=false;
Servo servo[6];
const long deltaTdeploy=15;
void setup()
{
  //Start the serial port
  Serial.begin(115200);
  //Initialize I/O
  pinMode (STATUS_LED, OUTPUT); // Status LED
  pinMode(sensT1, INPUT);
  pinMode(sensT2, INPUT);
  pinMode(sensL1, INPUT);
  pinMode(sensL2, INPUT);
  pinMode(sensL3, INPUT);
  pinMode(sensL4, INPUT);
  pinMode(sensV1, INPUT);
  pinMode(sensV2, INPUT);
  pinMode(sensV3, INPUT);
  pinMode(redPin,OUTPUT);
  pinMode(greenPin,OUTPUT);
pinMode(LEDsM[0],OUTPUT);
pinMode(LEDsM[1],OUTPUT);
pinMode(LEDsM[2],OUTPUT);
pinMode(LEDsM[3],OUTPUT);
pinMode(LEDsM[4],OUTPUT);
pinMode(LEDsM[5],OUTPUT);
pinMode(LEDsM[6],OUTPUT);
pinMode(LEDsM[7],OUTPUT);
pinMode(LEDsACT[0],OUTPUT);
pinMode(LEDsACT[1],OUTPUT);
pinMode(LEDsACT[2],OUTPUT);
pinMode(LEDsACT[3],OUTPUT);
pinMode(LEDsACT[4],OUTPUT);
pinMode(LEDsACT[5],OUTPUT);
pinMode(LEDsACT[6],OUTPUT);
pinMode(LEDsACT[7],OUTPUT);
pinMode(LEDsACT[8],OUTPUT);
pinMode(LEDsACT[9],OUTPUT);
pinMode(LEDsACT[10],OUTPUT);
pinMode(LEDsACT[11],OUTPUT);
//Create and attach servo objects+centering
  for (int i = 0; i < 4; i++)
  {
    pinMode(pinServos[i], OUTPUT);
    servo[i].attach(pinServos[i]);
    servo[i].write(minServos[i]);
    delay(50);
  }

  I2C_Init();

  digitalWrite(STATUS_LED, LOW);
  delay(1500);

  Accel_Init();
  Compass_Init();
  Gyro_Init();

  delay(20);

  for (int i = 0; i < 32; i++) // We take some readings...
  {
    Read_Gyro();
    Read_Accel();
    for (int y = 0; y < 6; y++) // Cumulate values
      AN_OFFSET[y] += AN[y];
    delay(20);
  }

  for (int y = 0; y < 6; y++)
    AN_OFFSET[y] = AN_OFFSET[y] / 32;

  AN_OFFSET[5] -= GRAVITY * SENSOR_SIGN[5];

  delay(2000);
  digitalWrite(STATUS_LED, HIGH);

  timer = millis();
  delay(20);
  counter = 0;
}

void loop() //Main Loop
{
  if ((millis() - timer) >= 20) // Main loop runs at 50Hz
  {
    counter++;
    timer_old = timer;
    timer = millis();
    if (timer > timer_old)
      G_Dt = (timer - timer_old) / 1000.0; // Real time of loop run. We use this on the DCM algorithm (gyro integration time)
    else
      G_Dt = 0;

    // *** DCM algorithm
    // Data adquisition
    Read_Gyro();   // This read gyro data
    Read_Accel();     // Read I2C accelerometer

    if (counter > 5)  // Read compass data at 10Hz... (5 loop runs)
    {
      counter = 0;
      Read_Compass();    // Read I2C magnetometer
      Compass_Heading(); // Calculate magnetic heading
    }

    // Calculations...
    Matrix_update();
    Normalize();
    Drift_correction();
    Euler_angles();
    // ***
    //Sensor handling
    Bat1 = map(analogRead(sensV1), refV1low, refV1high, 0, 100);
    Bat2 = map(analogRead(sensV2), refV2low, refV2high, 0, 100);
    Bat3 = map(analogRead(sensV3), refV3low, refV3high, 0, 100);
    Temp1 = map(analogRead(sensT1), refTlow, refThigh, 0, 100);
    Temp2 = map(analogRead(sensT2), refTlow, refThigh, 0, 100);
    LuzR = map(analogRead(sensL1), refLlow, refLhigh, 0, 100);
    LuzL = map(analogRead(sensL2), refLlow, refLhigh, 0, 100);
    LuzA = map((analogRead(sensL3) + analogRead(sensL4)) * 0.5, refLlow, refLhigh, 0, 100);
  //Take out the data
    printdata();
  }

}
