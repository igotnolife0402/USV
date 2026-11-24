// Player anime pose: R15 Motor6D name -> extra rotation [x, y, z] degrees, applied as C0 * CFrame.Angles (XYZ).
// Arms crossed (right over left), right knee raised, left leg trailing with pointed toe, head tilted.
export const PLAYER_POSE = {
  Waist: [4, -10, 0],
  Neck: [-10, 14, 12],
  RightShoulder: [10, 72, 0], RightElbow: [112, 0, 0],
  LeftShoulder: [22, -68, 0], LeftElbow: [104, 0, 0],
  RightHip: [78, 0, -6], RightKnee: [-102, 0, 0], RightAnkle: [-20, 0, 0],
  LeftHip: [-12, 0, 6], LeftKnee: [-28, 0, 0], LeftAnkle: [-35, 0, 0],
};
export const PLAYER_FLOAT = { height: 8, bob: 0.6, bobPeriod: 4 }; // studs above start, bob amplitude, seconds
