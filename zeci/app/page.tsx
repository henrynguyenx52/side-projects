"use client";

import React from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  Avatar,
  Rating,
  Chip,
} from "@mui/material";
import {
  School as SchoolIcon,
  Chat as ChatIcon,
  TrendingUp as TrendingUpIcon,
  MenuBook as MenuBookIcon,
  EmojiEvents as EmojiEventsIcon,
  Rocket as RocketIcon,
} from "@mui/icons-material";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import Layout from "./components/Layout";

const HeroSection = () => {
  return (
    <Box
      sx={{
        position: "relative",
        height: { xs: "60vh", md: "80vh" },
        backgroundImage:
          'url("https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80")',
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Content Box */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          color: "white",
          p: 4,
          borderRadius: 2,
          maxWidth: 600,
          textAlign: "center",
        }}
      >
        <Typography
          variant="h1"
          sx={{
            fontWeight: "bold",
            lineHeight: 1.2,
            fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
            mb: 2,
          }}
        >
          Chinh phục TOEIC cùng Zeci
        </Typography>

        <Typography
          variant="h6"
          sx={{
            opacity: 0.9,
            lineHeight: 1.6,
            fontSize: { xs: "1rem", sm: "1.1rem" },
            mb: 4,
          }}
        >
          Nâng trình tiếng Anh, mở cơ hội tương lai
        </Typography>

        <Button
          variant="contained"
          size="large"
          sx={{
            backgroundColor: "#1976d2",
            color: "white",
            px: 4,
            py: 2,
            fontSize: "1.1rem",
            fontWeight: 600,
            borderRadius: 2,
            "&:hover": {
              backgroundColor: "#1565c0",
            },
          }}
        >
          Kiểm tra ngay
        </Button>
      </Box>
    </Box>
  );
};

const MainContentCard = () => {
  const features = [
    {
      icon: <SchoolIcon sx={{ fontSize: 40, color: "white" }} />,
      title: "Lộ trình học cá nhân hóa",
      description: "Chương trình học được thiết kế riêng cho từng học viên",
    },
    {
      icon: <ChatIcon sx={{ fontSize: 40, color: "white" }} />,
      title: "Giảng dạy tận tâm, chuyên nghiệp",
      description: "Đội ngũ giáo viên giàu kinh nghiệm và nhiệt huyết",
    },
    {
      icon: <TrendingUpIcon sx={{ fontSize: 40, color: "white" }} />,
      title: "Cam kết điểm số đầu ra",
      description: "Đảm bảo học viên đạt được mục tiêu điểm số mong muốn",
    },
  ];

  const courses = [
    {
      title: "TOEIC Foundation",
      description: "Khóa học cơ bản dành cho người mới bắt đầu học TOEIC",
      icon: <MenuBookIcon sx={{ fontSize: 40, color: "#1976d2" }} />,
      rating: 5,
      students: "1,206 học viên",
    },
    {
      title: "TOEIC 550+",
      description: "Lộ trình nâng cao để đạt mục tiêu 550 điểm TOEIC",
      icon: <EmojiEventsIcon sx={{ fontSize: 40, color: "#1976d2" }} />,
      rating: 5,
      students: "3,230 học viên",
    },
    {
      title: "TOEIC 750+",
      description: "Chinh phục điểm số cao với chương trình chuyên sâu",
      icon: <RocketIcon sx={{ fontSize: 40, color: "#1976d2" }} />,
      rating: 5,
      students: "2,339 học viên",
    },
  ];

  const testimonials = [
    {
      name: "Nguyễn Thị Mai",
      score: "829 TOEIC",
      avatar:
        "https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80",
    },
    {
      name: "Trần Văn Nam",
      score: "829 TOEIC",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80",
    },
    {
      name: "Nguyễn Tấn Tài",
      score: "826 TOEIC",
      avatar:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80",
    },
  ];

  return (
    <Card
      sx={{
        mx: { xs: 2, md: 4 },
        mt: -4,
        mb: 4,
        borderRadius: 3,
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
      }}
    >
      {/* Why Choose Section - White Background */}
      <Box sx={{ backgroundColor: "#ffffff", p: { xs: 4, md: 6 } }}>
        <Container maxWidth="lg">
          <Typography
            variant="h2"
            textAlign="center"
            sx={{
              mb: { xs: 4, md: 6 },
              fontWeight: "bold",
              color: "#1B314B",
              fontSize: { xs: "1.75rem", md: "2.5rem" },
            }}
          >
            Tại sao chọn Zeci?
          </Typography>

          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid size={{ xs: 12, md: 4 }} key={index}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      mb: 2,
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <Box
                      sx={{
                        width: 80,
                        height: 80,
                        borderRadius: "50%",
                        backgroundColor: "#1976d2",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {feature.icon}
                    </Box>
                  </Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: "#1B314B",
                      mb: 2,
                    }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "#1B314B",
                      lineHeight: 1.6,
                    }}
                  >
                    {feature.description}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Courses Section - Gray Background */}
      <Box sx={{ backgroundColor: "#f8f9fa", p: { xs: 4, md: 6 } }}>
        <Container maxWidth="lg">
          <Typography
            variant="h2"
            textAlign="center"
            sx={{
              mb: { xs: 4, md: 6 },
              fontWeight: "bold",
              color: "#1B314B",
              fontSize: { xs: "1.75rem", md: "2.5rem" },
            }}
          >
            Các khóa học của chúng tôi
          </Typography>

          <Swiper
            modules={[Pagination, Autoplay]}
            spaceBetween={30}
            slidesPerView={1}
            pagination={{ clickable: true }}
            autoplay={{
              delay: 3000,
              disableOnInteraction: false,
            }}
            breakpoints={{
              640: {
                slidesPerView: 2,
                spaceBetween: 20,
              },
              768: {
                slidesPerView: 2,
                spaceBetween: 30,
              },
              1024: {
                slidesPerView: 3,
                spaceBetween: 30,
              },
            }}
            style={{
              paddingBottom: "50px",
            }}
          >
            {courses.map((course, index) => (
              <SwiperSlide key={index}>
                <Card
                  sx={{
                    height: "100%",
                    transition:
                      "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: "0 8px 25px -5px rgba(0, 0, 0, 0.1)",
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Stack spacing={2}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 2 }}
                      >
                        {course.icon}
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 600,
                            color: "#1B314B",
                          }}
                        >
                          {course.title}
                        </Typography>
                      </Box>

                      <Typography
                        variant="body2"
                        sx={{
                          color: "#1B314B",
                          lineHeight: 1.6,
                        }}
                      >
                        {course.description}
                      </Typography>

                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Rating value={course.rating} readOnly size="small" />
                        <Typography variant="body2" color="#1B314B">
                          {course.students}
                        </Typography>
                      </Box>

                      <Button
                        variant="contained"
                        sx={{
                          backgroundColor: "#ff6f00",
                          color: "white",
                          mt: 2,
                          py: 1.5,
                          fontSize: "0.95rem",
                          fontWeight: 600,
                          "&:hover": {
                            backgroundColor: "#e65100",
                          },
                        }}
                      >
                        Xem chi tiết
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </SwiperSlide>
            ))}
          </Swiper>
        </Container>
      </Box>

      {/* Testimonials Section - White Background */}
      <Box sx={{ backgroundColor: "#ffffff", p: { xs: 4, md: 6 } }}>
        <Container maxWidth="lg">
          <Typography
            variant="h2"
            textAlign="center"
            sx={{
              mb: { xs: 4, md: 6 },
              fontWeight: "bold",
              color: "#1B314B",
              fontSize: { xs: "1.75rem", md: "2.5rem" },
            }}
          >
            Học viên nói gì về Zeci?
          </Typography>

          <Swiper
            modules={[Pagination, Autoplay]}
            spaceBetween={30}
            slidesPerView={1}
            pagination={{ clickable: true }}
            autoplay={{
              delay: 4000,
              disableOnInteraction: false,
            }}
            breakpoints={{
              640: {
                slidesPerView: 2,
                spaceBetween: 20,
              },
              768: {
                slidesPerView: 2,
                spaceBetween: 30,
              },
              1024: {
                slidesPerView: 3,
                spaceBetween: 30,
              },
            }}
            style={{
              paddingBottom: "50px",
            }}
          >
            {testimonials.map((testimonial, index) => (
              <SwiperSlide key={index}>
                <Box sx={{ textAlign: "center" }}>
                  <Avatar
                    src={testimonial.avatar}
                    sx={{
                      width: 100,
                      height: 100,
                      mx: "auto",
                      mb: 2,
                      border: "4px solid #1976d2",
                    }}
                  />
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: "#1B314B",
                      mb: 1,
                    }}
                  >
                    {testimonial.name}
                  </Typography>
                  <Chip
                    label={testimonial.score}
                    sx={{
                      backgroundColor: "#1976d2",
                      color: "white",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                    }}
                  />
                </Box>
              </SwiperSlide>
            ))}
          </Swiper>
        </Container>
      </Box>
    </Card>
  );
};

export default function Home() {
  return (
    <Layout>
      <HeroSection />
      <MainContentCard />
    </Layout>
  );
}
