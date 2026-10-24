"use client";

import React from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Stack,
  Rating,
  Chip,
} from "@mui/material";
import {
  MenuBook as MenuBookIcon,
  EmojiEvents as EmojiEventsIcon,
  Rocket as RocketIcon,
  School as SchoolIcon,
  Headphones as HeadphonesIcon,
  Description as DescriptionIcon,
} from "@mui/icons-material";
import Layout from "../components/Layout";

const courses = [
  {
    title: "TOEIC Foundation",
    description:
      "Khóa học cơ bản dành cho người mới bắt đầu học TOEIC. Chương trình được thiết kế để xây dựng nền tảng vững chắc.",
    icon: <MenuBookIcon sx={{ fontSize: 40, color: "#1976d2" }} />,
    rating: 5,
    students: "1,206 học viên",
    duration: "3 tháng",
    level: "Cơ bản",
    price: "2,990,000 VNĐ",
  },
  {
    title: "TOEIC 550+",
    description:
      "Lộ trình nâng cao để đạt mục tiêu 550 điểm TOEIC. Phù hợp cho người đã có nền tảng cơ bản.",
    icon: <EmojiEventsIcon sx={{ fontSize: 40, color: "#1976d2" }} />,
    rating: 5,
    students: "3,230 học viên",
    duration: "4 tháng",
    level: "Trung cấp",
    price: "3,990,000 VNĐ",
  },
  {
    title: "TOEIC 750+",
    description:
      "Chinh phục điểm số cao với chương trình chuyên sâu. Dành cho người muốn đạt điểm số xuất sắc.",
    icon: <RocketIcon sx={{ fontSize: 40, color: "#1976d2" }} />,
    rating: 5,
    students: "2,339 học viên",
    duration: "5 tháng",
    level: "Nâng cao",
    price: "4,990,000 VNĐ",
  },
  {
    title: "TOEIC Listening",
    description:
      "Chuyên sâu kỹ năng nghe hiểu với các bài tập thực tế và chiến thuật làm bài hiệu quả.",
    icon: <HeadphonesIcon sx={{ fontSize: 40, color: "#1976d2" }} />,
    rating: 5,
    students: "1,850 học viên",
    duration: "2 tháng",
    level: "Mọi cấp độ",
    price: "1,990,000 VNĐ",
  },
  {
    title: "TOEIC Reading",
    description:
      "Nâng cao kỹ năng đọc hiểu với các dạng bài đa dạng và phương pháp làm bài tối ưu.",
    icon: <SchoolIcon sx={{ fontSize: 40, color: "#1976d2" }} />,
    rating: 5,
    students: "2,100 học viên",
    duration: "2 tháng",
    level: "Mọi cấp độ",
    price: "1,990,000 VNĐ",
  },
  {
    title: "Luyện đề 1000 câu",
    description:
      "Thực hành với 1000 câu hỏi TOEIC thực tế, giúp học viên làm quen với format đề thi.",
    icon: <DescriptionIcon sx={{ fontSize: 40, color: "#1976d2" }} />,
    rating: 5,
    students: "4,500 học viên",
    duration: "1 tháng",
    level: "Mọi cấp độ",
    price: "990,000 VNĐ",
  },
];

const CoursesPage = () => {
  return (
    <Layout>
      <Box
        sx={{
          py: { xs: 4, md: 6 },
          backgroundColor: "#f8f9fa",
          width: "100%",
        }}
      >
        <Box
          sx={{
            px: { xs: 2, sm: 3, md: 4 },
            width: "100%",
            maxWidth: "1400px",
            mx: "auto",
          }}
        >
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Typography
              variant="h1"
              sx={{
                fontWeight: "bold",
                color: "#1B314B",
                fontSize: { xs: "2rem", md: "3rem" },
                mb: 2,
              }}
            >
              Các khóa học TOEIC
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: "#1B314B",
                maxWidth: 600,
                mx: "auto",
              }}
            >
              Chọn khóa học phù hợp với trình độ và mục tiêu của bạn
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
              width: "100%",
            }}
          >
            {courses.map((course, index) => (
              <Box key={index}>
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    transition:
                      "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
                    "&:hover": {
                      transform: "translateY(-8px)",
                      boxShadow: "0 12px 40px rgba(0, 0, 0, 0.15)",
                    },
                  }}
                >
                  <CardContent
                    sx={{
                      p: 3,
                      flexGrow: 1,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        mb: 2,
                      }}
                    >
                      {course.icon}
                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 600,
                          color: "#1B314B",
                        }}
                      >
                        {course.title}
                      </Typography>
                    </Box>

                    <Typography
                      variant="body1"
                      sx={{
                        color: "#1B314B",
                        lineHeight: 1.6,
                        mb: 2,
                        flexGrow: 1,
                      }}
                    >
                      {course.description}
                    </Typography>

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 2,
                      }}
                    >
                      <Rating value={course.rating} readOnly size="small" />
                      <Typography variant="body2" color="#1B314B">
                        {course.students}
                      </Typography>
                    </Box>

                    <Box
                      sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}
                    >
                      <Chip
                        label={course.level}
                        size="small"
                        sx={{ backgroundColor: "#e3f2fd", color: "#1976d2" }}
                      />
                      <Chip
                        label={course.duration}
                        size="small"
                        sx={{ backgroundColor: "#f3e5f5", color: "#7b1fa2" }}
                      />
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 2,
                      }}
                    >
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: "bold",
                          color: "#ff6f00",
                        }}
                      >
                        {course.price}
                      </Typography>
                    </Box>

                    <Button
                      variant="contained"
                      fullWidth
                      sx={{
                        backgroundColor: "#ff6f00",
                        color: "white",
                        py: 1.5,
                        fontSize: "1rem",
                        fontWeight: 600,
                        "&:hover": {
                          backgroundColor: "#e65100",
                        },
                      }}
                    >
                      Đăng ký ngay
                    </Button>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>

          {/* Student Testimonials Section */}
          <Box
            sx={{
              mt: 2,
              textAlign: "center",
              py: 4,
              backgroundColor: "#ffffff",
              borderRadius: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography
              variant="h3"
              sx={{
                fontWeight: "bold",
                color: "#1B314B",
                fontSize: { xs: "1.5rem", md: "2rem" },
                mb: 1,
              }}
            >
              Học viên nói gì về chúng tôi
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: "#1B314B",
                maxWidth: 600,
                mx: "auto",
                mb: 2,
              }}
            >
              Những chia sẻ chân thực từ học viên đã đạt được mục tiêu TOEIC
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(3, 1fr)",
                },
                gap: 3,
                justifyContent: "center",
                width: "100%",
                maxWidth: "1200px",
                mx: "auto",
              }}
            >
              {[
                {
                  name: "Nguyễn Minh Anh",
                  score: "TOEIC 850",
                  testimonial:
                    "Khóa học TOEIC 750+ đã giúp tôi đạt được mục tiêu 850 điểm. Phương pháp giảng dạy rất hiệu quả và dễ hiểu.",
                  avatar: "MA",
                },
                {
                  name: "Trần Thị Hương",
                  score: "TOEIC 720",
                  testimonial:
                    "Từ mất gốc tiếng Anh, tôi đã đạt 720 điểm nhờ khóa Foundation. Cảm ơn thầy cô đã kiên nhẫn hướng dẫn.",
                  avatar: "TH",
                },
                {
                  name: "Lê Văn Nam",
                  score: "TOEIC 680",
                  testimonial:
                    "Khóa Listening và Reading riêng biệt giúp tôi cải thiện từng kỹ năng một cách có hệ thống. Rất hài lòng!",
                  avatar: "LN",
                },
              ].map((testimonial, index) => (
                <Box key={index}>
                  <Card
                    sx={{
                      height: "100%",
                      p: 3,
                      textAlign: "left",
                      transition: "transform 0.2s ease-in-out",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: "0 8px 25px rgba(0, 0, 0, 0.1)",
                      },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                      <Box
                        sx={{
                          width: 50,
                          height: 50,
                          borderRadius: "50%",
                          backgroundColor: "#1976d2",
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "bold",
                          mr: 2,
                        }}
                      >
                        {testimonial.avatar}
                      </Box>
                      <Box>
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: 600, color: "#1B314B" }}
                        >
                          {testimonial.name}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: "#ff6f00", fontWeight: 600 }}
                        >
                          {testimonial.score}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography
                      variant="body1"
                      sx={{
                        color: "#1B314B",
                        lineHeight: 1.6,
                        fontStyle: "italic",
                      }}
                    >
                      {testimonial.testimonial}
                    </Typography>
                  </Card>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </Layout>
  );
};

export default CoursesPage;
