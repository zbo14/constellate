const PropTypes = require('prop-types')
const React = require('react')

const Cell = ({ val, change }) => {
  const handleChange = evt => change(evt.target.value)
  return (
    <input className='cell' type='text' value={val} onChange={handleChange} />
  )
}

Cell.propTypes = {
  val: PropTypes.string.isRequired,
  change: PropTypes.func.isRequired
}

module.exports = Cell
