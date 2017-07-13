const PropTypes = require('prop-types');
const React = require('react');
const Cell = require('../Cell');

const Column = ({ val, change, remove}) {
  return (
    <div className="column">
      <button onClick={remove}>-</button>
      <Cell val={val} change={change} />
    </div>
  );
}

Column.propTypes = {
  val: PropTypes.string.isRequired
  change: PropTypes.func.isRequired,
  remove: PropTypes.func.isRequired
}

module.exports = Column;
