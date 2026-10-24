"use client";

import React from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  Rating,
  Button,
} from "@mui/material";
import {
  School as SchoolIcon,
  Star as StarIcon,
  Work as WorkIcon,
  Language as LanguageIcon,
} from "@mui/icons-material";
import Layout from "../components/Layout";

const teachers = [
  {
    name: "Thầy Nguyễn Văn Minh",
    title: "Giảng viên chính TOEIC",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    experience: "8 năm kinh nghiệm",
    rating: 4.9,
    students: "2,500+ học viên",
    specialties: ["TOEIC Listening", "TOEIC Reading", "Chiến thuật làm bài"],
    description:
      "Thầy Minh có hơn 8 năm kinh nghiệm giảng dạy TOEIC với tỷ lệ học viên đạt mục tiêu 95%.",
    achievements: ["IELTS 8.5", "TOEIC 990", "Chứng chỉ TESOL"],
  },
  {
    name: "Cô Trần Thị Hương",
    title: "Chuyên gia TOEIC Listening",
    avatar:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    experience: "6 năm kinh nghiệm",
    rating: 4.8,
    students: "1,800+ học viên",
    specialties: ["TOEIC Listening", "Phát âm", "Giao tiếp"],
    description:
      "Cô Hương chuyên về kỹ năng nghe với phương pháp giảng dạy sáng tạo và hiệu quả.",
    achievements: ["TOEIC 990", "Chứng chỉ CELTA", "Thạc sĩ Ngôn ngữ học"],
  },
  {
    name: "Thầy Lê Hoàng Nam",
    title: "Chuyên gia TOEIC Reading",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    experience: "7 năm kinh nghiệm",
    rating: 4.9,
    students: "2,200+ học viên",
    specialties: ["TOEIC Reading", "Từ vựng", "Ngữ pháp"],
    description:
      "Thầy Nam có kinh nghiệm sâu về phần Reading với nhiều chiến thuật làm bài hiệu quả.",
    achievements: ["TOEIC 990", "IELTS 8.0", "Cử nhân Sư phạm Anh"],
  },
  {
    name: "Cô Phạm Thị Lan",
    title: "Chuyên gia luyện thi TOEIC",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    experience: "5 năm kinh nghiệm",
    rating: 4.7,
    students: "1,500+ học viên",
    specialties: ["Luyện thi TOEIC", "Chiến thuật", "Tâm lý thi cử"],
    description:
      "Cô Lan chuyên về luyện thi với nhiều kinh nghiệm giúp học viên vượt qua áp lực thi cử.",
    achievements: ["TOEIC 990", "Chứng chỉ TESOL", "Thạc sĩ Tâm lý học"],
  },
  {
    name: "Thầy Đỗ Văn Tài",
    title: "Chuyên gia từ vựng TOEIC",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    experience: "9 năm kinh nghiệm",
    rating: 4.8,
    students: "3,000+ học viên",
    specialties: ["Từ vựng TOEIC", "Ngữ pháp", "Writing"],
    description:
      "Thầy Tài có phương pháp dạy từ vựng độc đáo giúp học viên nhớ lâu và sử dụng hiệu quả.",
    achievements: ["TOEIC 990", "IELTS 8.5", "Tiến sĩ Ngôn ngữ học"],
  },
  {
    name: "Cô Nguyễn Thị Mai",
    title: "Chuyên gia giao tiếp TOEIC",
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    experience: "4 năm kinh nghiệm",
    rating: 4.6,
    students: "1,200+ học viên",
    specialties: ["Giao tiếp", "Phát âm", "TOEIC Speaking"],
    description:
      "Cô Mai chuyên về kỹ năng giao tiếp với giọng Anh-Mỹ chuẩn và phương pháp dạy thú vị.",
    achievements: ["TOEIC 990", "Chứng chỉ TESOL", "Cử nhân Ngôn ngữ Anh"],
  },
];

const TeachersPage = () => {
  return (
    <Layout>
      <Box
        sx={{
          py: { xs: 4, md: 6 },
          backgroundColor: "#f8f9fa",
          minHeight: "100vh",
        }}
      >
        <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, width: "100%" }}>
          <Box sx={{ textAlign: "center", mb: 6 }}>
            <Typography
              variant="h1"
              sx={{
                fontWeight: "bold",
                color: "#1B314B",
                fontSize: { xs: "2rem", md: "3rem" },
                mb: 2,
              }}
            >
              Đội ngũ giảng viên
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: "#1B314B",
                maxWidth: 600,
                mx: "auto",
              }}
            >
              Đội ngũ giảng viên giàu kinh nghiệm, tận tâm và chuyên nghiệp
            </Typography>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(2, 1fr)",
                lg: "repeat(3, 1fr)",
                xl: "repeat(3, 1fr)",
              },
              gap: 3,
              justifyContent: "center",
            }}
          >
            {teachers.map((teacher, index) => (
              <Box key={index}>
                <Card
                  sx={{
                    height: "100%",
                    transition:
                      "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
                    "&:hover": {
                      transform: "translateY(-8px)",
                      boxShadow: "0 12px 40px rgba(0, 0, 0, 0.15)",
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ textAlign: "center", mb: 3 }}>
                      <Avatar
                        src={teacher.avatar}
                        sx={{
                          width: 120,
                          height: 120,
                          mx: "auto",
                          mb: 2,
                          border: "4px solid #1976d2",
                        }}
                      />

                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: "bold",
                          color: "#1B314B",
                          mb: 1,
                        }}
                      >
                        {teacher.name}
                      </Typography>

                      <Typography
                        variant="h6"
                        sx={{
                          color: "#1976d2",
                          mb: 2,
                        }}
                      >
                        {teacher.title}
                      </Typography>

                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 1,
                          mb: 2,
                        }}
                      >
                        <Rating value={teacher.rating} readOnly size="small" />
                        <Typography variant="body2" color="#1B314B">
                          {teacher.rating}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                      <Typography
                        variant="body1"
                        sx={{
                          color: "#1B314B",
                          lineHeight: 1.6,
                          mb: 2,
                        }}
                      >
                        {teacher.description}
                      </Typography>

                      <Box
                        sx={{
                          display: "flex",
                          gap: 1,
                          mb: 2,
                          flexWrap: "wrap",
                        }}
                      >
                        {teacher.specialties.map((specialty, specIndex) => (
                          <Chip
                            key={specIndex}
                            label={specialty}
                            size="small"
                            sx={{
                              backgroundColor: "#e3f2fd",
                              color: "#1976d2",
                            }}
                          />
                        ))}
                      </Box>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 1,
                        }}
                      >
                        <WorkIcon sx={{ fontSize: 16, color: "#1976d2" }} />
                        <Typography variant="body2" color="#1B314B">
                          {teacher.experience}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 1,
                        }}
                      >
                        <SchoolIcon sx={{ fontSize: 16, color: "#1976d2" }} />
                        <Typography variant="body2" color="#1B314B">
                          {teacher.students}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: "#1B314B",
                          mb: 1,
                        }}
                      >
                        Thành tích:
                      </Typography>
                      {teacher.achievements.map((achievement, achIndex) => (
                        <Typography
                          key={achIndex}
                          variant="body2"
                          sx={{
                            color: "#1B314B",
                            mb: 0.5,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <StarIcon sx={{ fontSize: 14, color: "#ff6f00" }} />
                          {achievement}
                        </Typography>
                      ))}
                    </Box>

                    <Button
                      variant="outlined"
                      fullWidth
                      sx={{
                        borderColor: "#1976d2",
                        color: "#1976d2",
                        py: 1.5,
                        fontSize: "1rem",
                        fontWeight: 600,
                        "&:hover": {
                          backgroundColor: "#1976d2",
                          color: "white",
                        },
                      }}
                    >
                      Xem hồ sơ
                    </Button>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>

          {/* Stats Section */}
          <Box
            sx={{ mt: 8, p: 4, backgroundColor: "#ffffff", borderRadius: 3 }}
          >
            <Typography
              variant="h4"
              sx={{
                fontWeight: "bold",
                color: "#1B314B",
                textAlign: "center",
                mb: 4,
              }}
            >
              Thống kê đội ngũ giảng viên
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(4, 1fr)",
                },
                gap: 3,
                justifyContent: "center",
              }}
            >
              <Box sx={{ textAlign: "center" }}>
                <Typography
                  variant="h2"
                  sx={{
                    fontWeight: "bold",
                    color: "#1976d2",
                    mb: 1,
                  }}
                >
                  6+
                </Typography>
                <Typography variant="h6" color="#1B314B">
                  Giảng viên chuyên nghiệp
                </Typography>
              </Box>

              <Box sx={{ textAlign: "center" }}>
                <Typography
                  variant="h2"
                  sx={{
                    fontWeight: "bold",
                    color: "#1976d2",
                    mb: 1,
                  }}
                >
                  40+
                </Typography>
                <Typography variant="h6" color="#1B314B">
                  Năm kinh nghiệm tổng cộng
                </Typography>
              </Box>

              <Box sx={{ textAlign: "center" }}>
                <Typography
                  variant="h2"
                  sx={{
                    fontWeight: "bold",
                    color: "#1976d2",
                    mb: 1,
                  }}
                >
                  12,000+
                </Typography>
                <Typography variant="h6" color="#1B314B">
                  Học viên đã đào tạo
                </Typography>
              </Box>

              <Box sx={{ textAlign: "center" }}>
                <Typography
                  variant="h2"
                  sx={{
                    fontWeight: "bold",
                    color: "#1976d2",
                    mb: 1,
                  }}
                >
                  95%
                </Typography>
                <Typography variant="h6" color="#1B314B">
                  Tỷ lệ học viên đạt mục tiêu
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Layout>
  );
};

export default TeachersPage;
