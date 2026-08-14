const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ParcelRequest = sequelize.define('ParcelRequest', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    referenceNumber: {
      type: DataTypes.STRING(13),
      unique: true,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Users', key: 'id' },
    },
    stationId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    size: {
      type: DataTypes.ENUM('Small', 'Medium', 'Large', 'Extra Large'),
      allowNull: false,
    },
    handlingFeeCents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM('AwaitingShipment', 'Shipped', 'Arrived', 'Delivered'),
      allowNull: false,
      defaultValue: 'AwaitingShipment',
    },
    trackingLink: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    shippingFrom: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    estimatedArrival: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    stripeSessionId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    qrCodeDataUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    signatureDataUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    shippedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    arrivedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    internalNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  });

  return ParcelRequest;
};
