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
      '**Control**\nA Teensy 4.0 programmed in the Arduino IDE runs the machine. The user sets the wire thickness (the gauge printed on the spool), the coil length, the number of layers and the winding speed. When a layer reaches the end of the coil length, the winding motor halts and the linear motor pulls the wire back on top of the previous layer, then repositions it exactly at the end of the coil before winding resumes. When the coil is done, the motors hold at rest so it cannot unwind. The user then applies adhesive and slides the coil off the shaft, using heat-shrink tubing placed on the shaft beforehand so the tubing can be pulled out through the finished coil once the adhesive dries.',
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
