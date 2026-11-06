import { calculateShortages } from "../src/calculate-shortages.js";
const requirements = [{ ingredientId: "tomato", quantity: 2, unit: "piece" }];
const pantry = [{ ingredientId: "tomato", quantity: 1, unit: "piece" }];
console.log("Requirements:", requirements);
console.log("Pantry:", pantry);
console.log("Expected:", [{ ingredientId: "tomato", quantity: 1, unit: "piece" }]);
try {
  console.log("Actual:", calculateShortages(requirements, pantry));
} catch (error) {
  if (error.message !== "TASK4_NOT_IMPLEMENTED") throw error;
  console.log("Pending: implement src/calculate-shortages.js.");
  process.exitCode = 1;
}
