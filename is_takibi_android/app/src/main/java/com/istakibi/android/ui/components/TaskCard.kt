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
    val statusColor = when (task.status) {
        "Kontrol Bekliyor" -> Color(0xFFF59E0B) // amber
        "Kontrol Yapıldı" -> Color(0xFF10B981) // emerald
        "Depozito Yatırıldı" -> Color(0xFF3B82F6) // blue
        "Gaz Açıldı" -> Color(0xFF8B5CF6) // violet
        else -> Color(0xFF64748B)
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFF1E293B) // slate-800
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
                    text = task.status.uppercase(),
                    color = statusColor,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Müşteri Adı
            Text(
                text = task.title,
                color = Color.White,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(4.dp))

            // Adres
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color(0xFFF59E0B).copy(alpha = 0.1f))
                    .padding(8.dp)
            ) {
                Text(
                    text = "📍 ",
                    fontSize = 12.sp
                )
                Text(
                    text = task.address,
                    color = Color(0xFFFCD34D), // amber-300
                    fontSize = 12.sp
                )
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
                        containerColor = Color.White.copy(alpha = 0.1f)
                    ),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("📅 Detay", color = Color(0xFF94A3B8), fontSize = 12.sp)
                }

                Row {
                    IconButton(
                        onClick = { },
                        modifier = Modifier
                            .size(40.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFF3B82F6).copy(alpha = 0.2f))
                    ) {
                        Text("📤", fontSize = 16.sp)
                    }
                    Spacer(modifier = Modifier.width(8.dp))
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
