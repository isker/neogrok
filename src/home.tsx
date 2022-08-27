import { useSearchParams } from "react-router-dom";
import * as styles from "./app.module.css";

const Home = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  return (
    <>
      <h1 className={styles.header}>Hello world!</h1>
      <input
        type="text"
        value={searchParams.get("q") ?? ""}
        onChange={(e) => {
          const q = e.target.value;
          setSearchParams(q ? { q } : {}, { replace: true });
        }}
      />
    </>
  );
};

export default Home;
