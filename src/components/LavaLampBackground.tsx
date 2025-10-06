import React from "react";
import styles from "../css/app.module.scss";

/**
 * Fundo dinâmico tipo "lava lamp" azul/roxo.
 * Usado tanto no visualizador central quanto no modo repouso.
 */
export const LavaLampBackground: React.FC = () => {
  return <div className={styles.lavaBg} aria-hidden="true" />;
};
