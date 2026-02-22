import React, { useState, useMemo } from "react";
import "./App.css";

const InputText = () => {
  const [text, setText] = useState("");

  console.log("Reder InputText");

  return (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      placeholder="ลองพิมพ์ดู หน้าจะไม่ค้าง"
    />
  );
};

const InputButton = ({ addCount, count, memoizedValue }) => {
  console.log("Render Input Button");

  return (
    <>
      <button onClick={() => addCount(1)}>เพิ่มเลข: {count}</button>
      <p>ผลลัพธ์การคำนวณ: {memoizedValue}</p>
    </>
  );
};

function App() {
  const [count, setCount] = useState(0);

  const expensiveCalculation = (num) => {
    console.log("กำลังคำนวณงานหนัก...");
    for (let i = 0; i < 1000000000; i++) {} // Loop นานๆ
    return num * 2;
  };

  const memoizedValue = expensiveCalculation(count);

  const addCount = (adder) => {
    setCount(count + adder);
  };

  console.log("Reder App");

  return (
    <div>
      <InputButton
        count={count}
        addCount={addCount}
        memoizedValue={memoizedValue}
      />

      <InputText />
    </div>
  );
}

export default App;
