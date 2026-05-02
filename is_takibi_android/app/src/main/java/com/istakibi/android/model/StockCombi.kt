package com.istakibi.android.model

import com.google.firebase.Timestamp

data class StockCombi(
    val id: String = "",
    val brand: String = "",
    val model: String = "",
    val capacity: String = "",
    val quantity: Int = 0,
    val barcodes: List<BarcodeData> = emptyList(),
    val outboundBarcodes: List<OutboundBarcodeData> = emptyList(),
    val createdAt: Timestamp? = null,
    val updatedAt: Timestamp? = null
)

data class BarcodeData(
    val code: String = "",
    val addedAt: Timestamp? = null
)

data class OutboundBarcodeData(
    val code: String = "",
    val originalCode: String = "", // Matches BarcodeData.code
    val customerName: String = "",
    val outputDate: Timestamp? = null
)
