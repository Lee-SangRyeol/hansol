import React, { useState, useEffect } from "react";
import styled, { keyframes } from "styled-components";
import { fonts } from "@/constants";

interface ToastProps {
  message: string;
}

const toastListeners: ((toast: ToastProps) => void)[] = [];

export const showToast = (message: string) => {
  toastListeners.forEach((listener) => listener({ message }));
};

const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  useEffect(() => {
    const addToast = (toast: ToastProps) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.slice(1));
      }, 4000);
    };

    toastListeners.push(addToast);

    return () => {
      const index = toastListeners.indexOf(addToast);
      if (index !== -1) toastListeners.splice(index, 1);
    };
  }, []);

  return (
    <Container>
      {toasts.map((toast, index) => (
        <Toast key={index}>{toast.message}</Toast>
      ))}
    </Container>
  );
};

export default ToastContainer;

const Container = styled.div`
  position: fixed;
  top: 40%;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 9999;
`;

const fadeOutAnimation = keyframes`
  from {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }

  to {
    opacity: 0;
    visibility: hidden;
    transform: translateY(80px);
  }
`;

const Toast = styled.div`
  background-color: #ffffff;
  color: #242424;
  font-size: 30px;
  font-family: ${fonts.pretendard.$700};
  padding: 16px 40px;
  border-radius: 12px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  width: fit-content;
  min-width: 200px;
  margin: 0 auto;
  word-wrap: break-word;
  animation: ${fadeOutAnimation} 0.2s ease-in-out 3.8s forwards;

  @media screen and (max-width: 480px) {
    max-width: calc(100vw - 40px);
    padding: 16px 20px;
  }
`;
