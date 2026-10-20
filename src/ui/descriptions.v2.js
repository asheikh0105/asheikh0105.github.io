// Written descriptions that replace the old-site text, keyed by project slug.
//   subtitle    one line under the title ('' = none)
//   paragraphs  body text; "**Heading**" at the start of a paragraph renders bold
//   reportTitle label for the report card (a PDF in photo_vid_uploads/<slug>/)
export const descriptions = {
  'coil-winder': {
    subtitle: '',
    paragraphs: [
      'An original machine I designed for my research at the Morphable Biorobotics Lab to wind copper wire into air-core electromagnets quickly and with less human error. The coils needed for the research were 10 mm long and 1 mm in diameter. The coil shown in the photos, next to a wallet for scale, has four layers of windings to maximize magnetic field strength for testing.',
      '**How it works**\nTwo stepper motors do the work. One spins the winding shaft, and the other advances the wire-feed carriage by exactly one wire thickness per revolution, so each turn lies neatly beside the last with no overlaps. The wire runs through the linearly restricted carriage and then through a 3D-printed eyelet on the rotating shaft, which secures one terminal of the coil. The other terminal is made by cutting the wire from the spool when winding finishes.',
      '**Control**\nA Teensy 4.0 programmed in the Arduino IDE runs the machine, with a Pololu Tic T825 motor controller driving each stepper. The user sets the wire thickness (the gauge printed on the spool), the coil length, the number of layers and the winding speed. When a layer reaches the end of the coil length, the winding motor halts and the linear motor pulls the wire back on top of the previous layer, then repositions it exactly at the end of the coil before winding resumes. When the coil is done, the motors hold at rest so it cannot unwind. The user then applies adhesive and slides the coil off the shaft, using heat-shrink tubing placed on the shaft beforehand so the tubing can be pulled out through the finished coil once the adhesive dries.',
      '**Design considerations**\nThe rotating shaft runs in a bearing with a clamped housing, which keeps it level and free of vibration. Wire tension stays constant because the motors are held rather than powered down when the coil is finished, and the spool is turned to tension the wire before starting. A bearing on the spool-holding shaft lets the winding motor turn the large spool easily, so tension cannot snap the wire if the spool lags.',
      'Engineering skills: prototyping and iterative design, laser cutting, 3D printing, Arduino IDE.',
    ],
  },
  'clawd-wirelessly-controlled-3-5-dof-mechanism': {
    subtitle: '',
    paragraphs: [
      "CLAW'D is a from-scratch claw machine built as a 3.5 DOF Cartesian gantry with fully wireless gameplay. The player pairs a PS5 DualSense controller over Bluetooth, steers a two-finger claw across the prize bed with the left stick and pulls the right trigger to launch an automated grab. The claw drops, grips, retracts, and either returns for another attempt or delivers the prize to a drop chute. We exceeded the course requirement of 2.5 DOF and a 2.5 in by 2.5 in workspace, reaching 250 mm by 200 mm, and ours was the only group in the section to build bearing-based carriages. I took the lead mechanical design role and kept a 1-to-1 digital twin of the physical product in CAD, so every part was validated before manufacturing despite delivery times, print times and machine shop hours.",
      '**Claw**\nA two-finger gripper laser-cut from acrylic and designed from scratch, which earned extra credit as an original end effector. One SG90 micro servo drives a gear on one finger that meshes with the other finger, so one finger drives and the other follows. To keep the grip surfaces from shearing past each other, several acrylic layers are laminated to build up thickness at the contact area. The claw hangs from fishing line wound on a 3D-printed spool on the Z motor, so Z homing is set by hand before power-on rather than with a limit switch.',
      '**Axes**\nX uses two synchronized NEMA 17 steppers, one at each end of the rails, run as a pair through Marlin\'s dual-stepper driver feature (250 mm of travel). Y is a single NEMA 17 on a carriage that rides the right X-rail (200 mm). Z is a NEMA 17 on the Y carriage winding the line (250 mm). The half degree of freedom is the claw itself, which toggles between two states, open and closed. Every axis runs on GT2 timing belts, with belt ends press-fit into the carriage bodies instead of separate tensioners.',
      '**Control system**\nAn MKS Base v1.6 runs a customized Marlin build and drives the four steppers and the servo, while an ESP32 handles Bluetooth (through Bluepad32) and gameplay logic, sending G-code over a UART link at 250,000 baud. The Marlin source had to be modified to disable the default USB serial and accept commands from the ESP32, to run dual X drivers with the second inverted, and to put the servo on pin D11. The ESP32 runs a five-state machine: wait for the controller and home, joystick control, an automated grab, retry, and dispense to a drop chute. Joystick input goes through a deadzone filter and scaling, and triggers are debounced and only register with the sticks centered, so a grab never fires while the player is still steering.',
      '**Frame and carriages**\nThe frame is nine bars of 1 in by 1 in 8020 extrusion with no corner brackets: each corner is a bolt through a post threaded into the end of the adjoining bar. Every moving carriage rides on three bearings inside the T-slots, two on one face and one on the other. This replaced an earlier 3D-printed T-slot adapter that added friction and wobbled under moment loads, and it was a dramatic improvement in motion quality.',
      '**Manufacturing and results**\nStructural and mechanical parts were 3D printed in PLA. PLA Silk looked good but was brittle and dimensionally inconsistent, so we switched to standard engineering-grade PLA for press fits, bearing seats and load-bearing carriages. Laser-cut acrylic forms the enclosure and the claw: clear on the front and flanks so the prize bed is visible, black at the rear and base. Cable management was the trickiest integration problem, since the servo cable travels through X, Y and Z at once, so I measured, cut and soldered exact lengths and enclosed them in a rigid sheath that bends in repeatable arcs. The demo ran with zero failures, picking up small plushies and custom ones with team members\' and professors\' faces iron-printed on.',
    ],
  },
  'analysis-2nd-order-system-linear-potentiometer': {
    subtitle: '',
    paragraphs: [
      "My final project for Boston University's Instrumentation and Measurement course (ME310) was to build a position measurement system for a mass-spring oscillator. The oscillator was driven by an electric motor of unknown speed and voltage, so only the percent-power dial marks on the motor controller could be used. From the measurements I had to derive the damping coefficient, spring constant, natural frequency and damping ratio, plot magnitude ratio against driving frequency, and plot position against time for several driving frequencies.",
      '**Measurement hardware**\nThe linear potentiometer is a wire with a sliding contact attached to the oscillating mass, so a small voltage across the wire makes a voltage divider whose output is linear in the mass\'s displacement. The wire measured 5 Ohm, so the input was set to 0.1 V to keep the current low. The divider output went through an inverting differential amplifier with a gain of 100 and into a DAQ set to a ±10 V full scale.',
      '**Calibration**\nI calibrated the amplifier and potentiometer in LabVIEW so voltage could be converted to displacement. Known weights compressed the spring and moved the sliding contact. To account for hysteresis I loaded to the maximum weight and then removed weights in the same increments. In MATLAB, force against displacement gave a line whose slope, by Hooke\'s Law, is the spring constant.',
      '**Frequency sweep and signal cleanup**\nI stepped the motor from 10% power (it would not turn below that) to 100% in 5% increments, sampling for 10 seconds at 1 kHz. The sliding contact was a free wire end in a small space, so it sometimes lost contact with the potentiometer wire and produced spikes from open circuits. To recover clean sinusoids I found the dominant frequency with a Fourier transform, then applied a low-pass filter and a moving median filter.',
      '**Extracting the parameters**\nI measured each signal\'s period by drawing a midline through the data and building a square wave of where the signal sat above or below it, then cleaning that square wave with a Fourier transform. The maximum of each period interval gave the amplitude, averaged over the signal, and invalid peaks were dropped where they misrepresented the system or were misclassified by MATLAB\'s findpeaks. The natural frequency came from the periods, and the resonance peak at 45% motor power gave the damping ratio, since amplitude at resonance depends only on that ratio.',
      'Engineering skills: measurement and uncertainty analysis, signal processing, MATLAB, LabVIEW.',
    ],
  },
  'lqr-inverted-pendulum-balancer': {
    subtitle: '',
    reportTitle: 'EC 402 Final Report',
    paragraphs: [
      "A cart-mounted pendulum that swings itself up from hanging straight down and then balances at the unstable upright position, using only back-and-forth motion of the cart. There is no motor at the pendulum's pivot: the controller has to move the cart to indirectly control the pendulum angle. If the pendulum is ever not upright, the system keeps working to push it back up. I worked on the dynamic modeling, hardware integration and Teensy firmware with a teammate.",
      '**Modeling and simulation**\nWe derived the cart-pendulum equations of motion with Lagrangian mechanics and linearized them about the upright position. In Python (NumPy and Matplotlib) we simulated both the linear and nonlinear models with RK4 integration at 10 ms steps, covering an energy-based swing-up, PID stabilization, disturbance recovery and gain sweeps for every controller parameter.',
      '**Hardware**\nThe pendulum sits on a rod held by two bearings, with a magnet on the other end read by a magnetic encoder. This platform rides on a three-bearing carriage on aluminum extrusion, driven by a GT2 belt, a NEMA 17 stepper and a TMC2209 driver. A Teensy runs the control loop.',
      '**From simulation to hardware**\nOn the real rig we switched from PID to LQR, because PID needed too much iterative tuning against real-world variability. The firmware runs as tasks at different rates, with a 200 Hz control tick and the encoder and stepper serviced faster. The encoder signal goes through a median filter, continuous angle unwrapping and a mode-dependent low-pass filter on velocity. A software slew-rate limiter stops sudden velocity changes from shaking the belt and mounts.',
      "A four-state machine (idle, swing-up, stabilize, recovery) retries failed catches instead of giving up, and only the user's switch can stop it. Near equilibrium, a deadband ignores sensor jitter and a position-dependent soft wall keeps the cart from drifting into the rail ends. We also found the stepper driver was running at twice the microstepping we assumed, which taught us to calibrate against a physical measurement before trusting spec-sheet numbers.",
    ],
  },
  'self-steering-tricycle': {
    subtitle: '',
    paragraphs: [
      "Self-Steering Tricycle for the Blind is a summer research project in a Boston University lab, funded by a Computing Research Association award I received. A Catrike Villager recumbent tricycle is retrofitted so a visually impaired rider can travel a GPS-defined route with the bike steering itself. The rider always pedals and can always brake by hand, which is a mechanical failsafe if autonomous braking fails. I was responsible for the complete hardware integration: the steering system, every electronics mount, and the wiring of the stack to the actuator, and I contributed to the controls and the pure-pursuit path following.",
      '**Zero-backlash steering**\nA linear actuator steers the two front wheels through the tie rod. One end of the actuator is bolted to the tie rod and the other to the frame, and both ends use rod-end (Heim) joints so the mechanism has the rotational freedom it needs without being overconstrained, which would cause binding. The mechanism is zero-backlash: the steering cannot be turned by hand to backdrive the actuator. The same design appears in the Designs section as the [[linear-actuator-steering-mechanism|Linear Actuator Steering Mechanism]].',
      '**Designed to fail in metal, not plastic**\nEvery part of the rig is 3D printed and joined with metal fasteners, so durability became a design problem: if something is going to fail, it should be a structural failure, not the printed material giving way. The parts are mostly PETG, because our client lives in Georgia, where summer heat in the 90s would soften PLA, and because PLA is too brittle for the cyclic loading of the steering being actuated.',
      '**Electronics stack**\nI designed every mount for the electronics: housings for the speaker, the NVIDIA Jetson Thor and the batteries, and swivel mounts that let the cameras be angled and clamped at angles other than 45 degrees when needed. All of the electronics ride on a rear rack, shown in the Designs section as the [[electronics-mounting-rack|Electronics Mounting Rack]].',
      '**How the system works**\nThe Jetson Thor processes a wide-view camera image, stitched from three cameras (one forward facing and two angled 45 degrees to the left and right), together with a VectorNav GPS/INS. A machine learning algorithm outputs a commanded steering angle, which is sent over serial to an ESP32, and the ESP32 drives the linear actuator through a motor driver. Speed is fused from a magnetic wheel odometer and the VectorNav IMU. Because speed and steering angle together determine the trajectory, the system also brakes autonomously to hit its curvature targets.',
      '**Rider feedback**\nWhen the rider must slow down or brake immediately, the system gives audio cues through a speaker and haptic cues through a vibrating vest.',
      '**Working with the client**\nOur client is Dan Parker, who is completely blind (his story is at theblindmachininst.com). I consulted him throughout for engineering advice and for what a blind rider would want in a commercially available product. The first in-person session with him was an improvement session where we retrofitted his own identical tricycle with our electronics (the photos here are of our test tricycle, which is why they differ from the video).',
      '**Results**\nThe in-person test was a continuous autonomous run of more than three quarters of a mile on public roads around the client\'s house, which was effectively a simulation of real consumer use. We then field tested with 10 visually impaired participants, who gave feedback on comfort and usability through surveys.',
      'Engineering skills: CAD, 3D printing and design for durability, actuator and linkage design, systems integration, controls.',
    ],
  },
  'linear-motor-control-soft-robotic-actuators': {
    subtitle: '',
    paragraphs: [
      "A hydraulic actuation system for soft robots built at the Morphable Biorobotics Lab, aimed at surgical operations performed through a catheter to the heart. Each robot is a stacked balloon actuator made of three columns of stacked balloons, and inflating or deflating the columns bends it into a curve. The control system pushes water into and out of each column with a syringe driven by a stepper motor. I designed all of the enclosures for the motor control boards and the physical actuation system, and I made the upgrade that scaled the system to syringes five times larger.",
      '**How it works**\nEach of the three channels is a luer-lock syringe (McMaster-Carr 6500T58) whose plunger is seated in a linear carriage. A NEMA 17 stepper turns a lead screw to push or pull the plunger, and the luer lock lets hoses adapt to each balloon column. The same syringe is used in the [[syringe-case|Syringe Case]] design in the Designs section, a separate storage module for syringes that are not in use. Microstepping a lead screw gives extremely fine control of how much water moves, which is what precise surgical manipulation needs. There are two control boards, one built around an Arduino Leonardo and one around a Teensy 4.0, and both use Pololu Tic T825 controllers to drive the steppers. They are programmed in the Arduino IDE and take their commands from a Python script on a data collection PC.',
      '**Enclosures and actuation hardware**\nBecause this was a research platform that was constantly being updated and modified, the enclosures were designed so the electronics can be removed and reinserted quickly.',
      '**Scaling up the syringes**\nThe original system used 1 mL syringes. I revised it for 5 mL syringes, which gives much more volumetric control without growing the control system. The stepper motors were already supplied with enough voltage and current to push and pull a larger syringe, so only the carriage and the syringe holder had to be redesigned.',
      '**Role in the wider platform**\nThe lab closes the loop on the robot\'s shape with three cameras that each view the robot from an orthogonal plane. A piecewise constant curvature (PCC) model estimates its curvature, and a machine learning model relates commanded inputs to the behavior the cameras observe.',
      'Engineering skills: CAD, 3D printing, stepper and lead-screw actuation, hydraulic systems, Arduino IDE.',
    ],
  },
  'bar-balancing-car': {
    subtitle: '',
    paragraphs: [
      "A PID-controlled car that carries a free-standing bar on its top and drives between two points without tipping it. There is no sensor on the bar: the controller's only job is to move the car smoothly enough that the bar stays up. I did the full mechanical design, including CAD and fabrication by 3D printing and laser cutting, and I worked on implementing and tuning the PID controller.",
      '**Why the bar tips**\nThe bar is a simple 1 in by 1 in by 12 in rod standing on the cart. When the car accelerates forward, the rod effectively feels a force at its center of mass pointing backward, and it tips once its contact force with the cart top falls to zero. That condition sets the maximum linear acceleration the car can use. I calculated it by hand as 2.68 ft/s^2 and confirmed it in SOLIDWORKS.',
      '**Controller**\nThe car follows a ramped acceleration profile rather than stepping to a target speed. Smooth acceleration removes jerk, and keeping the acceleration under the tipping limit keeps the bar upright, while the PID loop tracks the profile. The car is driven by a stepper motor with a built-in encoder, through an L298N driver controlled by an Arduino Uno.',
      '**Construction**\nThe chassis is 1/4 in MDF, laser cut, and all the other mounting hardware is 3D printed in PLA or metal fasteners. The PLA wheel and TPU tire are shown in the [[wheel-and-tire-assembly|Wheel and Tire Assembly]] design in the Designs section.',
      '**Result**\nIn the demo video the car drives 5 ft and back without the bar tipping. The simulation predicted 10.32 seconds for the 10 ft round trip and the demo took 12 seconds, a gap I attribute to friction and other effects the simulation did not account for.',
      'Engineering skills: CAD (SOLIDWORKS), laser cutting, 3D printing, PID control and tuning.',
    ],
  },
  'multi-robot-navigator': {
    subtitle: '',
    paragraphs: [
      "A decentralized controller I wrote on my own in plain Python for AgileX LIMO robots that must all reach distinct goal positions at once. It works like a person walking through a crowd: every robot runs the same control law and can only control itself. It can see where the other robots are relative to itself, from motion capture at Boston University's Robotics and Autonomous Systems Teaching and Innovation Center (RASTIC), but it cannot command them, and yet they all get to their targets without colliding.",
      'Paths are planned before the run and updated in real time as robots cross paths and as others park at their destinations. Intersections are negotiated greedily but politely: a robot lets the robots that are closer to their targets go first. The script contains the LIMO controller and also simulates a 12-robot run, placing the robots randomly on a grid and assigning each a target. In the simulation the motion capture feedback is just the true robot positions shared with every robot. The same script was also run on real LIMOs with the motion capture system, so this was not a pure simulation.',
    ],
  },
  'obstacle-course-navigator': {
    subtitle: '',
    paragraphs: [
      'MATLAB code I wrote for an AgileX LIMO robot to plan a path around a predetermined obstacle course with A* and then drive it in the motion capture arena. We placed physical obstacles to recreate the digital course, and the motion capture feedback let me project the planned trajectory and the obstacle coordinates onto real-world locations.',
      'The final controller combines feedforward, using pure pursuit to steer toward the planned trajectory, with feedback from motion capture tracking the true position of the LIMO. It navigated three different obstacle courses successfully; the video shows all three runs and the photos show the course maps.',
    ],
  },
  'blue-line-following-robot': {
    subtitle: '',
    paragraphs: [
      "MATLAB-based computer vision navigation for an AgileX LIMO robot. A pure pursuit controller masks the LIMO's onboard camera image so that it sees only blue, which makes the robot pursue blue paths and nothing else. At detected intersections it is biased toward taking a turn rather than going straight.",
      'We also experimented with biasing left and right turns over each other to give the robot a hierarchy of choices. This ran into the limits of how far ahead the robot can see, and of how early it must decide, since it cannot act on a path it has already passed. In the video the robot turns early on purpose: its steering angle is hardware limited to a wide range, so it cannot start a sharp turn on short notice.',
    ],
  },
  'e-bike-conversion': {
    subtitle: '',
    paragraphs: [
      'A personal, hands-on passion project: I fully retrofitted my Genesis Saracino hardtail mountain bike into an e-bike with a Bafang mid-drive motor. The conversion includes electronic brake cutoffs, a handlebar-mounted display, a thumb throttle, spoke-magnet based odometry and gear shift sensing.',
    ],
  },
}

// GitHub repositories (github.com/asheikh0105), keyed by project slug.
export const githubRepos = {
  'lqr-inverted-pendulum-balancer': 'LQR-Inverted-Pendulum',
  'bar-balancing-car': 'Bar-Balancing-Car',
  'eye-tracker': 'Eye-Tracker',
  'banana-finder': 'Banana-Detector',
  'obstacle-course-navigator': 'Obstacle-Course-Navigator',
  'analysis-2nd-order-system-linear-potentiometer': 'Data-Processing-for-2nd-Order-Oscillator',
  'multi-robot-navigator': 'Multi-Robot-Navigator',
  'blue-line-following-robot': 'Blue-Line-Following-Robot',
}
