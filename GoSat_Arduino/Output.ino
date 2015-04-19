void printdata(void)
{
  //If there's something to read from the serial port
  if ((Serial.available() > 0) || continuous)
  {
    //Check for the data
    switch (Serial.read()) {
      case 'R':
        {
          //We want to read, so we print ALL THE DATA
          Serial.print(Temp1, 2);
          Serial.print(",");
          Serial.print(Temp2, 2);
          Serial.print(",");
          Serial.print(ToDeg(roll), 6);
          Serial.print(",");
          Serial.print(ToDeg(pitch), 6);
          Serial.print(",");
          Serial.print(ToDeg(yaw), 6);
          Serial.print(",");
          Serial.print(Bat1, 3);
          Serial.print(",");
          Serial.print(Bat2, 3);
          Serial.print(",");
          Serial.print(Bat3, 3);
          Serial.print(",");
          Serial.print(LuzR, 3);
          Serial.print(",");
          Serial.print(LuzL, 3);
          Serial.print(",");
          Serial.print(LuzA, 3);
          Serial.println();
          Serial.flush();
          break;
        }
      case 'S':
        {
          //We want to set values to the different systems
          charPanels = Serial.read();
          charMotor = Serial.read();
          charRed = Serial.read();
          charGreen = Serial.read();
          if ((charPanels == '1') && !desplegado
             )
          { desplegado = true;
            deployPanels();
          }
          if ((charPanels == '0') && desplegado)
          { desplegado = false;
            retractPanels();
          }
          if ((charMotor == '1') && !motor
          )
          { 
            motor = true;
            motorOn();
          }
          if ((charMotor == '0') && motor)
          { 
            motor = false;
            motorOff();
          }
          if ((charGreen == '1') && !green
          );
          { green = true;
            digitalWrite(greenPin, HIGH);
          }
          if ((charGreen == '0') && green);
          { green = false;
            digitalWrite(greenPin, LOW);
          }
          if ((charRed == '1') && !red
          )
          {red=true;
            digitalWrite(redPin, HIGH);
          }
          if ((charRed == '0') && red)
          {red=false;
            digitalWrite(redPin, LOW);
          }
          break;
        }
      default:
        {
          Serial.println("Otro");
          Serial.flush();
        }
    }
    //At the end we empty the serial buffer in case some data arrived out of time
    while (Serial.available() > 0)
    {
      Serial.read();
    }
    
  }

}

long convert_to_dec(float x)
{
  return x * 10000000;
}

void retractPanels()
{
  //Arduino does not like this
//  for (int i = 0; i < 255; i++)
//  {
//    servo[0].write(minServos[0] - i / 254 * (minServos[0] - maxServos[0]));
//    servo[1].write(minServos[1] - i / 254 * (minServos[1] - maxServos[1]));
//    servo[2].write(minServos[2] - i / 254 * (minServos[2] - maxServos[2]));
//    servo[3].write(minServos[3] - i / 254 * (minServos[3] - maxServos[3]));
//    delay(deltaTdeploy);
//  }
  servo[0].write(minServos[0]);
  servo[1].write(minServos[1]);
  servo[2].write(minServos[2]);
  servo[3].write(minServos[3]);
}

void deployPanels() {
  //Neither this
//  for (int i = 0; i < 255; i++)
//  {
//    servo[0].write(maxServos[0] - i / 254 * (maxServos[0] - minServos[0]));
//    servo[1].write(maxServos[1] - i / 254 * (maxServos[1] - minServos[1]));
//    servo[2].write(maxServos[2] - i / 254 * (maxServos[2] - minServos[2]));
//    servo[3].write(maxServos[3] - i / 254 * (maxServos[3] - minServos[3]));
//    delay(deltaTdeploy);
//  }
  servo[0].write(maxServos[0]);
  servo[1].write(maxServos[1]);
  servo[2].write(maxServos[2]);
  servo[3].write(maxServos[3]);
}

void motorOn()
{
//Set high a bunch of pins
    digitalWrite(LEDsM[0], HIGH);
    digitalWrite(LEDsM[1], HIGH);
    digitalWrite(LEDsM[2], HIGH);
    digitalWrite(LEDsM[3], HIGH);
    digitalWrite(LEDsM[4], HIGH);
    digitalWrite(LEDsM[5], HIGH);
    digitalWrite(LEDsM[6], HIGH);
    digitalWrite(LEDsM[7], HIGH);

}

void motorOff()
{
  //Set low a bunch of pins
    digitalWrite(LEDsM[0], LOW);
    digitalWrite(LEDsM[1], LOW);
    digitalWrite(LEDsM[2], LOW);
    digitalWrite(LEDsM[3], LOW);
    digitalWrite(LEDsM[4], LOW);
    digitalWrite(LEDsM[5], LOW);
    digitalWrite(LEDsM[6], LOW);
    digitalWrite(LEDsM[7], LOW);
}
