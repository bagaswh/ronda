import { ActionRunner } from "../src/action-runner";

/** @type {(ActionRunner)} */
let actionRunner;
beforeEach(() => {
  actionRunner = new ActionRunner();
});

function generateClockString() {
  const date = new Date();
  return `${date.getHours()}:${date.getMinutes() - 1}`;
}

it("should run action within schedule", async () => {
  await actionRunner.run([
    {
      resourceId: "sample_resource_id",
      actions: [
        {
          time: generateClockString(),
          type: "__test_action__",
        },
      ],
    },
  ]);
  expect(actionRunner.__testActionCalled__).toBe(1);
});

it("should run action only when conditions match", async () => {});

// it("should not run action outside schedule", () => {});

// it("should run actions with the latest hours first", () => {});

// it("should stop after running the first action", () => {});

// it("should write to action history after running an action", async () => {
//   await actionRunner.run([
//     {
//       resourceId: "sample_resource_id",
//       actions: [
//         {
//           time: generateClockString(),
//           type: "__test_action__",
//         },
//       ],
//     },
//   ]);
// });

// it("should not run the same action twice", () => {});
