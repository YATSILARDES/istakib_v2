package com.istakibi.android.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.istakibi.android.model.Task

@Composable
fun TaskCard(
    task: Task,
    onClick: () -> Unit
) {
    val statusLabel = when (task.status) {
        "TO_CHECK" -> "Kontrol Bekliyor"
        "CHECK_COMPLETED" -> "Kontrol Yapıldı"
        "DEPOSIT_PAID" -> "Depozito Yatırıldı"
        "GAS_OPENING" -> "Gaz Açılımı"
        "GAS_OPENED" -> "Gaz Açıldı"
        "BILL_CUT" -> "Fatura Kesildi"
        else -> task.status
    }

    val statusColor = when (task.status) {
        "TO_CHECK" -> Color(0xFFF59E0B) // amber
        "CHECK_COMPLETED" -> Color(0xFF10B981) // emerald
        "DEPOSIT_PAID" -> Color(0xFF3B82F6) // blue
        "GAS_OPENING" -> Color(0xFF8B5CF6) // violet
        "GAS_OPENED" -> Color(0xFF06B6D4) // cyan
        "BILL_CUT" -> Color(0xFF64748B) // slate
        else -> Color(0xFF64748B)
    }

    // Determine Card Colors based on checkStatus
    val isMissing = task.checkStatus == "missing"
    val isClean = task.checkStatus == "clean"

    val containerColor = when {
        isMissing -> Color(0xFFFEE2E2) // Red 100
        isClean -> Color(0xFFDCFCE7) // Green 100
        else -> Color(0xFF1E293B) // Slate 800
    }

    val contentColor = when {
        isMissing || isClean -> Color.Black
        else -> Color.White
    }

    val subTextColor = when {
        isMissing || isClean -> Color(0xFF374151) // Gray 700
        else -> Color(0xFF94A3B8) // Slate 400
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = containerColor
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            // Durum Badge
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(statusColor.copy(alpha = 0.2f))
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            ) {
                Text(
                    text = statusLabel,
                    color = statusColor,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Müşteri Adı
            Text(
                text = task.title,
                color = contentColor,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(4.dp))

            // Adres
            if (!task.address.isNullOrEmpty()) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (isMissing || isClean) Color.White.copy(alpha=0.5f) else Color(0xFFF59E0B).copy(alpha = 0.1f))
                        .padding(8.dp)
                ) {
                    Text(
                        text = "📍 ",
                        fontSize = 12.sp
                    )
                    Text(
                        text = task.address,
                        color = if (isMissing || isClean) Color.Black else Color(0xFFFCD34D), // amber-300
                        fontSize = 12.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Alt Butonlar
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Button(
                    onClick = { },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isMissing || isClean) Color.Black.copy(alpha = 0.05f) else Color.White.copy(alpha = 0.1f)
                    ),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("📅 Detay", color = subTextColor, fontSize = 12.sp)
                }

                Row {
                    if (!task.phone.isNullOrEmpty()) {
                        IconButton(
                            onClick = { },
                            modifier = Modifier
                                .size(40.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color(0xFF10B981).copy(alpha = 0.2f))
                        ) {
                            Text("📞", fontSize = 16.sp)
                        }
                    }
                }
            }
        }
    }
}
