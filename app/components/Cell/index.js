const PropTypes = require('prop-types');
const React = require('react');

const Cell = ({ val, change }) => {
  return (
    <input className="cell" type="text" value={val} onChange={change} />
  );
}

Cell.propTypes = {
  val: PropTypes.string.isRequired,
  change: PropTypes.func.isRequired
}

module.exports = Cell;
