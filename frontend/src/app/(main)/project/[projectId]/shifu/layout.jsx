import { ReactFlowProvider } from '@xyflow/react';

export default function layout({ children }) {
  return <ReactFlowProvider>{children}</ReactFlowProvider>;
}
