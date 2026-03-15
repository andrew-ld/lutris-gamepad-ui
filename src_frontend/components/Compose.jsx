const Compose = ({ components, children }) => {
  let accumulator = children;

  for (const Component of components.toReversed()) {
    accumulator = <Component>{accumulator}</Component>;
  }

  return accumulator;
};

export default Compose;
