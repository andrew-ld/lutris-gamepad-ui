const Compose = ({ components, children }) => {
  return components.reduceRight((acc, Component) => {
    return <Component>{acc}</Component>;
  }, children);
};

export default Compose;
